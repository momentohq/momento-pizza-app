const { DynamoDBClient, BatchWriteItemCommand } = require('@aws-sdk/client-dynamodb');
const { marshall } = require('@aws-sdk/util-dynamodb');
const ddb = new DynamoDBClient();

exports.handler = async (event, context) => {
  try {
    const ipAddress = event.requestContext.identity.sourceIp;
    const id = context.awsRequestId;

    const input = JSON.parse(event.body);
    const timestamp = new Date().toISOString();
    const orderMetadata = {
      pk: id,
      sk: 'metadata',
      createdAt: timestamp,
      type: 'order', //GSI PK
      creator: ipAddress, //GSI SK
      numItems: input.items.length,
      status: 'WAITING ON CUSTOMER'
    };

    const orderItems = input.items.map((item, index) => {
      return {
        PutRequest: {
          Item: marshall(
            {
              pk: id,
              sk: `item#${index}`,
              size: item.size,
              crust: item.crust,
              toppings: item.toppings,
              sauce: item.sauce,
              lastUpdate: timestamp
            }
          )
        }
      };
    });

    const command = new BatchWriteItemCommand({
      RequestItems: {
        [process.env.TABLE_NAME]: [
          {
            PutRequest: {
              Item: marshall(orderMetadata)
            }
          },
          ...orderItems
        ]
      }
    });

    await ddb.send(command);

    return {
      statusCode: 201,
      body: JSON.stringify({ id }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Something went wrong' }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    }
  }
};