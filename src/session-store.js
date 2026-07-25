const util = require('util');
const Store = require('express-session/session/store');
const supabase = require('./supabase');

function SupabaseSessionStore() {
  Store.call(this);
  this.table = 'sessions';
}

util.inherits(SupabaseSessionStore, Store);

SupabaseSessionStore.prototype.get = function (sid, callback) {
  supabase.from(this.table).select('sess').eq('sid', sid).single()
    .then(({ data, error }) => {
      if (error || !data) return callback(null, null);
      try {
        const sess = typeof data.sess === 'string' ? JSON.parse(data.sess) : data.sess;
        callback(null, sess);
      } catch (e) {
        callback(null, null);
      }
    })
    .catch(() => callback(null, null));
};

SupabaseSessionStore.prototype.set = function (sid, session, callback) {
  try {
    const sess = JSON.parse(JSON.stringify(session));
    const expires = sess.cookie && sess.cookie.expires
      ? new Date(sess.cookie.expires)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    supabase.from(this.table).upsert(
      { sid, sess, expire: expires.toISOString() },
      { onConflict: 'sid' }
    )
      .then(({ error }) => {
        if (error) console.error('[SessionStore] set error:', error.message);
        callback(null);
      })
      .catch((err) => {
        console.error('[SessionStore] set error:', err.message);
        callback(null);
      });
  } catch (e) {
    console.error('[SessionStore] set error:', e.message);
    callback(null);
  }
};

SupabaseSessionStore.prototype.destroy = function (sid, callback) {
  supabase.from(this.table).delete().eq('sid', sid)
    .then(() => callback(null))
    .catch(() => callback(null));
};

SupabaseSessionStore.prototype.touch = function (sid, session, callback) {
  try {
    const sess = JSON.parse(JSON.stringify(session));
    const expires = sess.cookie && sess.cookie.expires
      ? new Date(sess.cookie.expires)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    supabase.from(this.table)
      .update({ expire: expires.toISOString() })
      .eq('sid', sid)
      .then(() => callback(null))
      .catch(() => callback(null));
  } catch (e) {
    callback(null);
  }
};

module.exports = SupabaseSessionStore;
