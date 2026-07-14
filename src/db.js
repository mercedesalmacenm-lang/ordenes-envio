const supabase = require('./supabase');

const queryAll = async (table, filters = {}, order = null) => {
  let q = supabase.from(table).select('*');
  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== null && val !== '') {
      q = q.eq(key, val);
    }
  }
  if (order) q = q.order(order.column, { ascending: order.asc !== false });
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
};

const queryOne = async (table, filters = {}) => {
  let q = supabase.from(table).select('*');
  for (const [key, val] of Object.entries(filters)) {
    q = q.eq(key, val);
  }
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data;
};

const queryPaginated = async (table, { filters = {}, search = null, searchCols = [], page = 1, limit = 20, order = { column: 'fecha', asc: false } } = {}) => {
  let countQ = supabase.from(table).select('*', { count: 'exact', head: true });
  let q = supabase.from(table).select('*');

  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== null && val !== '') {
      countQ = countQ.eq(key, val);
      q = q.eq(key, val);
    }
  }

  if (search && searchCols.length > 0) {
    const orStr = searchCols.map(c => `${c}.ilike.%${search}%`).join(',');
    countQ = countQ.or(orStr);
    q = q.or(orStr);
  }

  const { count: total } = await countQ;
  const offset = (page - 1) * limit;
  q = q.order(order.column, { ascending: order.asc !== false }).range(offset, offset + limit - 1);

  const { data, error } = await q;
  if (error) throw error;
  return { items: data || [], total: total || 0 };
};

const insert = async (table, row) => {
  const { data, error } = await supabase.from(table).insert(row).select();
  if (error) throw error;
  return data ? data[0] : null;
};

const update = async (table, row, filters = {}) => {
  let q = supabase.from(table).update(row);
  for (const [key, val] of Object.entries(filters)) {
    q = q.eq(key, val);
  }
  const { error } = await q;
  if (error) throw error;
};

const remove = async (table, filters = {}) => {
  let q = supabase.from(table).delete();
  for (const [key, val] of Object.entries(filters)) {
    q = q.eq(key, val);
  }
  const { error } = await q;
  if (error) throw error;
};

const count = async (table, filters = {}) => {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== null && val !== '') {
      q = q.eq(key, val);
    }
  }
  const { count: c, error } = await q;
  if (error) throw error;
  return c || 0;
};

module.exports = { queryAll, queryOne, queryPaginated, insert, update, remove, count };
