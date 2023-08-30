const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { Metrics, MetricUnits } = require('@aws-lambda-powertools/metrics');
const { unmarshall, marshall } = require('@aws-sdk/util-dynamodb');
const metrics = new Metrics({ namespace: 'Momento', serviceName: 'pizza-tracker' });
const ddb = new DynamoDBClient();
// load SecretsManager and Momento SDKs - best practice is to initialize outside the main handler
const { CacheClient, CredentialProvider, Configurations, CacheGet } = require('@gomomento/sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const secrets = new SecretsManagerClient();
let cacheClient;
let cacheResult;

exports.handler = async (event) => {
  try {

    // Determine the cache item key we are interested in - tracking customer by source IP for this example
    const ipAddress = event.requestContext.identity.sourceIp;

    // Initialize Momento session
    await initializeMomento();

    // Record the time stamp of the beginning of the cache check
    const momentoStart = new Date();

    // *** Uncomment following line to enable caching
    // cacheResult = await cacheClient.get('pizza', ipAddress);

    // Record elapsed time for cache check
    const momentoTime = (new Date().getTime() - momentoStart.getTime());
    metrics.addMetric('get-my-orders-latency-cache', MetricUnits.Milliseconds, momentoTime);

    if(cacheResult instanceof CacheGet.Error){
      // Oops
      console.error(`Something went wrong! ${cacheResult.toString()}`);
      throw cacheResult.innerException();
    } elseif(cacheResult instanceof CacheGet.Hit){
    // If the item is found in the cache, record as a cache hit. Also record total latency as cache latency alone. Publish to CW, return result and close out.
      metrics.addMetric('get-my-orders-cache-hit', MetricUnits.Count, 1);
      metrics.addMetric('get-my-orders-latency-total', MetricUnits.Milliseconds, momentoTime);
      metrics.publishStoredMetrics();
      // Delete the cache entry some of the time - to simulate some misses and gather enough datapoints for latency
      // of going to the database directly.
      // *** Uncomment following line to enable caching
      // if(Math.random() > 0.9){
      //   await cacheClient.delete('pizza', ipAddress);
      // };
      return {
        statusCode: 200,
        body: cacheResult.valueString(),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    } else {
      // Item was not found in the cache - so we'll check the database instead.
      // Record the cache miss and time stamp of beginning of DB read call

      metrics.addMetric('get-my-orders-cache-miss', MetricUnits.Count, 1);

      const ddbStart = new Date();

      const results = await ddb.send(new QueryCommand({
        TableName: process.env.TABLE_NAME,
        IndexName: 'type',
        KeyConditionExpression: '#type = :type and #creator = :creator',
        ExpressionAttributeNames: {
          '#type': 'type',
          '#creator': 'creator'
        },
        ExpressionAttributeValues: marshall({
          ':type': 'order',
          ':creator': ipAddress
        })
      }));

      // Note the time spent in reading from DynamoDB.

      const ddbTime = (new Date().getTime() - ddbStart.getTime());
      metrics.addMetric('get-my-orders-latency-ddb', MetricUnits.Milliseconds, ddbTime);

      const orders = [];
      results.Items.map(item => {
        const data = unmarshall(item);
        orders.push({
          id: data.pk,
          createdAt: data.createdAt,
          status: data.status,
          numItems: data.numItems,
          ...data.lastUpdated && { lastUpdated: data.lastUpdated }
        })
      });
    
      orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const orderResponse = JSON.stringify(orders);
    
      // Record start time of writing back the data to the cache
      const writebackStart = new Date();

      // Copy the data into the proper cache item (ready for next read)
      // *** Uncomment line below to enable caching
      // await cacheClient.set('pizza', ipAddress, orderResponse);

      // Record elapsed time for writeback to cache
      const writebackTime = (new Date().getTime() - writebackStart.getTime());

      // Close out the total latency metric (includes cache miss, database read, copy to cache) and publish to CW.
      metrics.addMetric('get-my-orders-latency-total', MetricUnits.Milliseconds, (ddbTime + momentoTime + writebackTime));
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
      }
  };
};

// Setup the connection to Momento Cache - but only if it isn't already present.
const initializeMomento = async () => {
  if(cacheClient){
    return;
  };

  // Get our Momento Cache auth token from AWS Secrets Manager
  const secretResponse = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ID }));
  const secret = JSON.parse(secretResponse.SecretString);

  // Initialize Momento Cache session using default tuning for in-region clients, token from secrets manager, and a default TTL of 60s
  cacheClient = new CacheClient({
    configuration: Configurations.Lambda.latest(),
    credentialProvider: CredentialProvider.fromString({ authToken: secret.momento }),
    defaultTtlSeconds: 60
  });
};