const { Client } = require("@elastic/elasticsearch");

const INDEX_NAME = process.env.ELASTIC_ORDER_INDEX || "orders";
let client;

function getClient() {
  if (client) {
    return client;
  }

  const node = process.env.ELASTIC_NODE || "http://127.0.0.1:9200";
  const username = process.env.ELASTIC_USERNAME;
  const password = process.env.ELASTIC_PASSWORD;

  const options = { node };
  if (username && password) {
    options.auth = { username, password };
  }

  client = new Client(options);
  return client;
}

async function ensureIndex() {
  const es = getClient();
  const exists = await es.indices.exists({ index: INDEX_NAME });
  if (exists) {
    return;
  }

  await es.indices.create({
    index: INDEX_NAME,
    mappings: {
      properties: {
        id: { type: "keyword" },
        date: { type: "keyword" },
        status: { type: "keyword" },
        items: { type: "integer" },
        total: { type: "double" },
        items_list: { type: "keyword" },
        created_at: { type: "date" },
      },
    },
  });
}

async function indexOrder(order) {
  const es = getClient();
  await es.index({
    index: INDEX_NAME,
    id: order.id,
    document: {
      ...order,
      created_at: new Date().toISOString(),
    },
    refresh: "wait_for",
  });
}

async function getOrderById(id) {
  const es = getClient();
  const result = await es.get({ index: INDEX_NAME, id });
  return result._source || null;
}

async function listOrders({ size = 100 } = {}) {
  const es = getClient();
  const result = await es.search({
    index: INDEX_NAME,
    size,
    sort: [{ created_at: { order: "desc" } }],
    query: { match_all: {} },
  });

  return (result.hits?.hits || []).map((hit) => hit._source);
}

async function getOrderCount() {
  const es = getClient();
  const result = await es.count({ index: INDEX_NAME, query: { match_all: {} } });
  return result.count || 0;
}

async function checkElasticHealth() {
  try {
    const es = getClient();
    const response = await es.cluster.health();
    return {
      ok: true,
      status: response.status,
      clusterName: response.cluster_name,
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message,
    };
  }
}

module.exports = {
  ensureIndex,
  indexOrder,
  getOrderById,
  listOrders,
  getOrderCount,
  checkElasticHealth,
};
