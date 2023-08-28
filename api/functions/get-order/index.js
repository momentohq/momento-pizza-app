const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { Metrics, MetricUnits } = require('@aws-lambda-powertools/metrics');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const ddb = new DynamoDBClient();
const metrics = new Metrics({ namespace: 'Momento', serviceName: 'pizza-tracker' });
// load SecretsManager and Momento SDKs - best practice is to initialize outside the main handler
const { CacheClient, CredentialProvider, Configurations, CacheGet } = require('@gomomento/sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const secrets = new SecretsManagerClient();
let cacheClient;
let cacheResult;

exports.handler = async (event) => {
  try {

    // Initialize Momento session
    await initializeMomento();

    const orderId = event.pathParameters.orderId;

    // Determine the cache item key we are interested in
    const cacheKey = process.env.RESTRICT_TO_CREATOR == 'true' ? orderId : `ADMIN-${orderId}`;
    
    // Record the time stamp of the beginning of the cache check
    const momentoStart = new Date();

    // *** Uncomment following line to enable caching
    // cacheResult = await cacheClient.get('pizza', cacheKey);
    
    // Record elapsed time for cache check
    const momentoTime = (new Date().getTime() - momentoStart.getTime());
    metrics.addMetric('get-order-latency-cache', MetricUnits.Milliseconds, momentoTime);

    if(cacheResult instanceof CacheGet.Error){
      // Oops
      console.error(`Something went wrong! ${cacheResult.toString()}`);
      throw cacheResult.innerException();
    } elseif(cacheResult instanceof CacheGet.Hit){
    // If the item is found in the cache, record as a cache hit. Also record total latency as same as cache latency alone. Publish to CW, return result and close out.
      metrics.addMetric('get-order-cache-hit', MetricUnits.Count, 1);
      metrics.addMetric('get-order-latency-total', MetricUnits.Milliseconds, momentoTime);
      metrics.publishStoredMetrics();
      return {
        statusCode: 200,
        body: cacheResult.valueString(),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    } else {
      // Item was not found in the cache - so we'll check the database instead.
      // Record the cache miss and time stamp of beginning of DB read call

      metrics.addMetric('get-order-cache-miss', MetricUnits.Count, 1);

      const ddbStart = new Date();

      const result = await ddb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: event.pathParameters.orderId,
          sk: 'metadata'
        })
      }));

      // Note the time spent in reading from DynamoDB.

      const ddbTime = (new Date().getTime() - ddbStart.getTime());
      metrics.addMetric('get-order-latency-ddb', MetricUnits.Milliseconds, ddbTime);

      if (!result.Item) {
        // Not found in database - close out the total latency metric (includes cache miss, database read) and publish to CW.
        metrics.addMetric('get-order-latency-total', MetricUnits.Milliseconds, (ddbTime + momentoTime));
        metrics.publishStoredMetrics();
        return {
          statusCode: 404,
          body: JSON.stringify({ message: 'An order with the specified id could not be found.' }),
          headers: { 'Access-Control-Allow-Origin': '*' }
        };
      }

      const data = unmarshall(result.Item)
      if (process.env.RESTRICT_TO_CREATOR == 'true' && data?.creator !== event.requestContext.identity.sourceIp) {
        // The user is not the creator of this order.
        // Close out the total latency metric (includes cache miss, database read) and publish to CW.
        metrics.addMetric('get-order-latency-total', MetricUnits.Milliseconds, (ddbTime + momentoTime));
        metrics.publishStoredMetrics();
        return {
          statusCode: 403,
          body: JSON.stringify({ message: 'You are not allowed to view the requested order.' }),
          headers: { 'Access-Control-Allow-Origin': '*' }
        };
      }

      const order = {
        id: data.pk,
        createdAt: data.createdAt,
        numItems: data.numItems,
        status: data.status,
        items: data.items,
        ...(process.env.RESTRICT_TO_CREATOR == 'false') && { creator: data.creator }
      };

      // Build out the value that we'll return and ultimately store in the cache.
      const orderResponse = JSON.stringify(order);

      // Record start time of writing back the data to the cache
      const writebackStart = new Date();

      // Copy the data into the proper cache item (ready for next read)
      // *** Uncomment line below to enable caching
      // await cacheClient.set('pizza', cacheKey, orderResponse);

      // Record elapsed time for writeback to cache
      const writebackTime = (new Date().getTime() - writebackStart.getTime());

      // Close out the total latency metric (includes cache miss, database read, copy to cache) and publish to CW.
      metrics.addMetric('get-order-latency-total', MetricUnits.Milliseconds, (ddbTime + momentoTime + writebackTime));
      metrics.publishStoredMetrics();

      return {
        statusCode: 200,
        body: orderResponse,
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    }
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  }
}

// Setup the connection to Momento Cache - but only if it isn't already present.
const initializeMomento = async () => {
  if (cacheClient) {
    return;
  };

  // Get our Momento Cache auth token from AWS Secrets Manager
  const secretResponse = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ID }));
  const secret = JSON.parse(secretResponse.SecretString);

  // Initialize Momento Cache session using default tuning for in-region clients, token from secrets manager, and a default TTL of 60s
  cacheClient = new CacheClient({
    configuration: Configurations.InRegion.Default.latest(),
    credentialProvider: CredentialProvider.fromString({ authToken: secret.momento }),
    defaultTtlSeconds: 60
  });
};