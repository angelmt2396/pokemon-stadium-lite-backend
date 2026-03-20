const queueByKey = new Map();

export const runSerialized = async (key, task) => {
  const previous = queueByKey.get(key) ?? Promise.resolve();

  let release;

  const current = new Promise((resolve) => {
    release = resolve;
  });

  queueByKey.set(key, current);

  await previous;

  try {
    return await task();
  } finally {
    release();

    if (queueByKey.get(key) === current) {
      queueByKey.delete(key);
    }
  }
};
