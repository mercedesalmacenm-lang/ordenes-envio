const EventEmitter = require('events');
const supabase = require('./supabase');

class SupabaseSessionStore extends EventEmitter {
  constructor() {
    super();
    this.table = 'sessions';
  }

  get(sid, callback) {
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
  }

  set(sid, session, callback) {
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
  }

  destroy(sid, callback) {
    supabase.from(this.table).delete().eq('sid', sid)
      .then(() => callback(null))
      .catch(() => callback(null));
  }

  touch(sid, session, callback) {
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
  }
}

module.exports = SupabaseSessionStore;
