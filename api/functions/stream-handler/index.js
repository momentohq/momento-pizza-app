const { unmarshall } = require('@aws-sdk/util-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { CacheClient, CredentialProvider, Configurations, CacheGet } = require('@gomomento/sdk');
const secrets = new SecretsManagerClient();
let cacheClient;

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

const handleNewOrUpdatedCacheItem = async (record) => {
  const isOrderRecord = (record.sk == 'metadata');
  if (isOrderRecord) {
    let item = {
      id: record.pk,
      createdAt: record.createdAt,
      status: record.status,
      numItems: record.numItems,
      items: [],
      ...record.lastUpdated && { lastUpdated: record.lastUpdated }
    };

    const cachedDataResponse = await cacheClient.get('pizza', item.id);
    if (cachedDataResponse instanceof CacheGet.Hit) {
      const cachedItem = JSON.parse(cachedDataResponse.valueString());
      item = {
        ...cachedItem,
        ...item
      };
    }

    await Promise.allSettled([
      await cacheClient.set('pizza', item.id, JSON.stringify(item)),
      await cacheClient.set('pizza', `ADMIN-${item.id}`, JSON.stringify({ ...item, creator: record.creator }))
    ]);

    delete item.items;

    await Promise.allSettled([
      await updateArrayCacheItem('all-orders', item),
      await updateArrayCacheItem(record.creator, item)
    ]);
  } else {
    const cachedDataResponse = await cacheClient.get('pizza', record.pk);
    if (cachedDataResponse instanceof CacheGet.Hit) {
      const cachedItem = JSON.parse(cachedDataResponse.valueString());
      const itemIndex = record.sk.split('#')[1];
      const item = {
        size: record.size,
        crust: record.crust,
        sauce: record.sauce,
        toppings: record.toppings || []
      }
      if (cachedItem.items[itemIndex]) {
        cachedItem.items[itemIndex] = item;
      } else {
        cachedItem.items.push(item);
      }

      await cacheClient.set('pizza', record.pk, JSON.stringify(cachedItem));
    }
  }
};

const updateArrayCacheItem = async (key, item) => {
  let cachedArray;
  const arrayResponse = await cacheClient.get('pizza', key);
  if (arrayResponse instanceof CacheGet.Hit) {
    cachedArray = JSON.parse(arrayResponse.valueString());
    const index = cachedArray.findIndex(i => i.id == item.id);
    if (index < -1) {
      cachedArray[index] = { ...cachedArray[index], ...item }
    } else {
      cachedArray.push(item);
    }
  } else {
    cachedArray = [item];
  }

  await cacheClient.set('pizza', key, JSON.stringify(cachedArray));
};

const handleDeletedCacheItem = async (record) => {
  const isOrderRecord = (record.sk == 'metadata');
  if (isOrderRecord) {
    await Promise.allSettled([
      await cacheClient.delete('pizza', record.pk),
      await cacheClient.delete('pizza', `ADMIN-${record.pk}`),
      await deleteArrayCacheItem('allOrders', record.pk),
      await deleteArrayCacheItem(record.creator, record.pk)
    ]);
  } else {
    const cachedDataResponse = await cacheClient.get('pizza', record.pk);
    if (cachedDataResponse instanceof CacheGet.Hit) {
      // When orders are updated, all items are deleted then re-added. So we can clear all items out
      // from the cache when we see a delete because they are about to be re-added.
      const cachedItem = JSON.parse(cachedDataResponse.valueString());
      await Promise.allSettled([
        await cacheClient.set('pizza', record.pk, JSON.stringify({ ...cachedItem, items: [] })),
        await cacheClient.set('pizza', `ADMIN-${record.pk}`, JSON.stringify({ ...cachedItem, creator: record.creator, items: [] }))
      ]);
    }
  }
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
  if (cacheClient) {
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