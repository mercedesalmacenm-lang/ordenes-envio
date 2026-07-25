const EventEmitter = require('events');
const supabase = require('./supabase');

class SupabaseSessionStore extends EventEmitter {
  constructor() {
    this.table = 'sessions';
  }

  get(sid, callback) {
    supabase.from(this.table).select('sess').eq('sid', sid).single()
      .then(({ data, error }) => {
        if (error || !data) return callback(null, null);
        if (new Date(data.sess.cookie.expires) < new Date()) {
          this.destroy(sid, () => callback(null, null));
          return;
        }
        callback(null, data.sess);
      })
      .catch(() => callback(null, null));
  }

  set(sid, session, callback) {
    const sess = JSON.parse(JSON.stringify(session));
    supabase.from(this.table).upsert({ sid, sess, expire: new Date(sess.cookie.expires) }, { onConflict: 'sid' })
      .then(() => callback(null))
      .catch(() => callback(null));
  }

  destroy(sid, callback) {
    supabase.from(this.table).delete().eq('sid', sid)
      .then(() => callback(null))
      .catch(() => callback(null));
  }

  touch(sid, session, callback) {
    const sess = JSON.parse(JSON.stringify(session));
    supabase.from(this.table).update({ expire: new Date(sess.cookie.expires) }).eq('sid', sid)
      .then(() => callback(null))
      .catch(() => callback(null));
  }
}

module.exports = SupabaseSessionStore;
