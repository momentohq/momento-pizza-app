const { unmarshall } = require('@aws-sdk/util-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { CacheClient, CredentialProvider, Configurations, CacheGet, TopicClient } = require('@gomomento/sdk');
const secrets = new SecretsManagerClient();
let cacheClient;
let topicClient;

exports.handler = async (event) => {
  try {
    await initializeMomento();
    const record = event.Records[0];
    switch (record.eventName) {
      case 'INSERT':
      case 'MODIFY':
        await handleNewOrUpdatedCacheItem(unmarshall(record.dynamodb.NewImage));
        break;
      case 'REMOVE':
        await handleDeletedCacheItem(unmarshall(record.dynamodb.OldImage));
        break;
    }
  } catch (err) {
    console.error(err);
  }
};

// Comment out the below to enable publishing of updates via Momento Topics
const handleNewOrUpdatedCacheItem = async (record) => {
  setTimeout(updateOrderRecord,20,record);
};

// Uncomment the below to enable publishing of updates via Momento Topics
//const handleNewOrUpdatedCacheItem = async (record, oldRecord) => {
//  await updateOrderRecord(record);
//  if (!oldRecord) {
//    await topicClient.publish('pizza', 'new-order', JSON.stringify({ id: record.pk }));
//  } else {
//    const topicName = (record.status == oldRecord.status) ? `${record.pk}-updated` : `${record.pk}-status-updated`;
//    await topicClient.publish('pizza', topicName, JSON.stringify({ status: record.status }));
//  }
//};

const updateArrayCacheItem = async (key, item) => {
  let cachedArray;
  const arrayResponse = await cacheClient.get('pizza', key);
  if (arrayResponse instanceof CacheGet.Hit) {
    cachedArray = JSON.parse(arrayResponse.valueString());
    const index = cachedArray.findIndex(i => i.id == item.id);
    if (index < -1) {
      cachedArray[index] = { ...cachedArray[index], ...item }
    } else {
      cachedArray.unshift(item);
    }
  } else {
    cachedArray = [item];
  }

  await cacheClient.set('pizza', key, JSON.stringify(cachedArray));
};

const handleDeletedCacheItem = async (record) => {
  await Promise.allSettled([
    await cacheClient.delete('pizza', record.pk),
    await cacheClient.delete('pizza', `ADMIN-${record.pk}`),
    await deleteArrayCacheItem('allOrders', record.pk),
    // Comment out the line below to enable publishing of updates via Momento Topics
    await deleteArrayCacheItem(record.creator, record.pk)
    // Uncomment the lines below to enable publishing of updates via Momento Topics
    // await deleteArrayCacheItem(record.creator, record.pk),
    // await topicClient.publish('pizza', 'order-canceled', JSON.stringify({ id: record.pk }))
  ]);    
};

const deleteArrayCacheItem = async (key, itemId) => {
  const arrayResponse = await cacheClient.get('pizza', key);
  if (arrayResponse instanceof CacheGet.Hit) {
    const cachedArray = JSON.parse(arrayResponse.valueString());
    const index = cachedArray.findIndex(i => i.id == itemId);
    if (index > -1) {
      cachedArray.splice(index, 1);
    }

    await cacheClient.set('pizza', key, JSON.stringify(cachedArray));
  }
};

const initializeMomento = async () => {
  if (cacheClient && topicClient) {
    return;
  }

  const secretResponse = await secrets.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ID }));
  const secret = JSON.parse(secretResponse.SecretString);
  cacheClient = await CacheClient.create({
    configuration: Configurations.Lambda.latest(),
    credentialProvider: CredentialProvider.fromString({ authToken: secret.momento }),
    defaultTtlSeconds: 60
  });
  topicClient = new TopicClient({
    configuration: Configurations.InRegion.Default.latest(),
    credentialProvider: CredentialProvider.fromString({ authToken: secret.momento })
  });
};

async function updateOrderRecord(record) {
  let item = {
    id: record.pk,
    createdAt: record.createdAt,
    status: record.status,
    numItems: record.numItems,
    items: record.items,
    ...record.lastUpdated && { lastUpdated: record.lastUpdated }
  };

  await Promise.allSettled([
    await cacheClient.set('pizza', item.id, JSON.stringify(item)),
    await cacheClient.set('pizza', `ADMIN-${item.id}`, JSON.stringify({ ...item, creator: record.creator }))
  ]);

  delete item.items;

  await Promise.allSettled([
    await updateArrayCacheItem('all-orders', item),
    await updateArrayCacheItem(record.creator, item)
  ]);
};