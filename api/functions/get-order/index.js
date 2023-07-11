const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { Metrics, MetricUnits } = require('@aws-lambda-powertools/metrics');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const ddb = new DynamoDBClient();
const metrics = new Metrics({ namespace: 'Momento', serviceName: 'pizza-tracker' });
/* Enable for Caching
// load SecretsManager and Momento SDKs
const { CacheClient, CredentialProvider, Configurations, CacheGet } = require('@gomomento/sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const secrets = new SecretsManagerClient();
let cacheClient;
*/

exports.handler = async (event) => {
  try {
    // Record starting time for the overall function
    const totalstart = new Date();

    /* Enable for Caching
    // Initialize Momento session
    await initializeMomento();
    
    // Record the time stamp of the beginning of the cache check
    const momstart = new Date();

    // Determine the cache item key we are interested in
    const orderId = event.pathParameters.orderId;
    
    // Check for the item in the cache
    const cacheKey = process.env.RESTRICT_TO_CREATOR == 'true' ? orderId : `ADMIN-${orderId}`;
    const cacheResult = await cacheClient.get('pizza', cacheKey);

    // If the item is found in the cache, record metric for end of cache operation latency and record as a cache hit.
    // Close out total latency metric. Publish to CloudWatch, then return the result to the API call and close out the function.
    if(cacheResult instanceof CacheGet.Hit){
      metrics.addMetric('get-order-latency-cache', MetricUnits.Milliseconds, (new Date().getTime() - momstart.getTime()));
      metrics.addMetric('get-order-cache-hit', MetricUnits.Count, 1);
      metrics.addMetric('get-order-latency-total', MetricUnits.Milliseconds, (new Date().getTime() - totalstart.getTime()));
      metrics.publishStoredMetrics();
      return {
        statusCode: 200,
        body: cacheResult.valueString(),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    };
    */

    // Item was not found in the cache - so we'll check the database instead.
    const ddbstart = new Date();

    const result = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: event.pathParameters.orderId,
        sk: 'metadata'
      })
    }));

    if (!result.Item) {
      // Not found in database - close out the total latency metric (includes cache miss, database read) and publish to CW.
      metrics.addMetric('get-order-latency-total', MetricUnits.Milliseconds, (new Date().getTime() - totalstart.getTime()));
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
      metrics.addMetric('get-order-latency-total', MetricUnits.Milliseconds, (new Date().getTime() - totalstart.getTime()));
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

    metrics.addMetric('get-order-latency-ddb', MetricUnits.Milliseconds, (new Date().getTime() - ddbstart.getTime()));
    metrics.addMetric('get-order-cache-miss', MetricUnits.Count, 1);

    /* Enable for Caching
    // Copy the data into the proper cache item (ready for next read)
    await cacheClient.set('pizza', cacheKey, orderResponse);
    */

    // Close out the total latency metric (includes cache miss, database read, copy to cache) and publish to CW.
    metrics.addMetric('get-order-latency-total', MetricUnits.Milliseconds, (new Date().getTime() - totalstart.getTime()));
    metrics.publishStoredMetrics();

    return {
      statusCode: 200,
      body: orderResponse,
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  }
};

/* Enable for Caching
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
    configuration: Configurations.Laptop.latest(),
    credentialProvider: CredentialProvider.fromString({ authToken: secret.momento }),
    defaultTtlSeconds: 60
  });
};
*/