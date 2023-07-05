const { DynamoDBClient, QueryCommand } = require('@aws-sdk/client-dynamodb');
const { Metrics, MetricUnits } = require('@aws-lambda-powertools/metrics');
const { marshall, unmarshall } = require('@aws-sdk/util-dynamodb');
const { CacheClient, CredentialProvider, Configurations, CacheGet } = require('@gomomento/sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const ddb = new DynamoDBClient();
const metrics = new Metrics({ namespace: 'Momento', serviceName: 'pizza-tracker' });
const secrets = new SecretsManagerClient();
let cacheClient;

exports.handler = async (event) => {
  try {
    await initializeMomento();
    const start = new Date();
    const result = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: '#pk = :pk',
      ExpressionAttributeNames: {
        '#pk': 'pk'
      },
      ExpressionAttributeValues: marshall({
        ':pk': event.pathParameters.orderId
      })
    }));

    if (!result.Items.length) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'An order with the specified id could not be found.' }),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    }

    const data = result.Items.map(item => unmarshall(item));
    const metadata = data.find(d => d.sk == 'metadata');
    if (process.env.RESTRICT_TO_CREATOR == 'true' && metadata?.creator !== event.requestContext.identity.sourceIp) {
      // The user is not the creator of this order. 
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'You are not allowed to view the requested order.' }),
        headers: { 'Access-Control-Allow-Origin': '*' }
      };
    }

    const order = {
      id: metadata.pk,
      createdAt: metadata.createdAt,
      numItems: metadata.numItems,
      status: metadata.status,
      items: [],
      ...(process.env.RESTRICT_TO_CREATOR == 'false') && { creator: metadata.creator }
    };

    const items = data.filter(d => d.sk.startsWith('item#'));
    for (const item of items) {
      order.items.push({
        size: item.size,
        crust: item.crust,
        sauce: item.sauce,
        toppings: item.toppings || []
      });
    }
    
    const orderResponse = JSON.stringify(order);
    await cacheClient.set('pizza', event.pathParameters.orderId, orderResponse);
    
    metrics.addMetric('get-order-latency', MetricUnits.Milliseconds, (new Date().getTime() - start.getTime()));
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

const initializeMomento = async () => {
  if(cacheClient){
    return;
  }

  const secretResponse = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ID }));
  const secret = JSON.parse(secretResponse.SecretString);
  cacheClient = new CacheClient({
    configuration: Configurations.Laptop.latest(),
    credentialProvider: CredentialProvider.fromString({ authToken: secret.momento }),
    defaultTtlSeconds: 60
  });  
};