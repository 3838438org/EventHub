package com.mobicrave.eventtracker.index;

import com.google.common.base.Joiner;
import com.google.common.collect.Sets;
import com.mobicrave.eventtracker.base.DB;
import com.mobicrave.eventtracker.base.KeyValueCallback;
import com.mobicrave.eventtracker.model.Event;
import com.mobicrave.eventtracker.model.User;

import java.io.Closeable;
import java.io.IOException;
import java.util.List;
import java.util.Set;

public class PropertiesIndex implements Closeable {
  private static final Set<String> KEYS_IGNORED = Sets.newHashSet("", "date",
      "external_user_id", "event_type");
  private static final byte[] DUMMY = new byte[0];

  private final DB db;

  public PropertiesIndex(DB db) {
    this.db = db;
  }

  public void addEvent(final Event event) {
    final String eventType = event.getEventType();
    db.put(new DB.AtomicWrite() {
      public void write(final DB.WriteBatch writeBatch) {
        event.enumerate(new KeyValueCallback() {
          @Override
          public void callback(String key, String value) {
            if (KEYS_IGNORED.contains(key)) {
              return;
            }
            writeBatch.put(getKeyPrefixForEventType(eventType) + key, DUMMY);
            writeBatch.put(getKeyPrefixForEventTypeAndKey(eventType, key) + value, DUMMY);
          }
        });
      }
    });
  }

  public void addUser(final User user) {
    db.put(new DB.AtomicWrite() {
      public void write(final DB.WriteBatch writeBatch) {
        user.enumerate(new KeyValueCallback() {
          @Override
          public void callback(String key, String value) {
            if (KEYS_IGNORED.contains(key)) {
              return;
            }
            writeBatch.put(getKeyPrefixForUser() + key, DUMMY);
            writeBatch.put(getKeyPrefixForUserAndKey(key) + value, DUMMY);
          }
        });
      }
    });
  }

  public List<String> getEventKeys(String eventType) {
    String keyKey = getKeyPrefixForEventType(eventType);
    return db.findByPrefix(keyKey, keyKey.length());
  }

  public List<String> getEventValues(String eventType, String key, String valuePrefix) {
    String valueKey = getKeyPrefixForEventTypeAndKey(eventType, key);
    return db.findByPrefix(valueKey + valuePrefix, valueKey.length());
  }

  public List<String> getUserKeys() {
    String prefix = getKeyPrefixForUser();
    return db.findByPrefix(prefix, prefix.length());
  }

  public List<String> getUserValues(String key, String valuePrefix) {
    String valueKey = getKeyPrefixForUserAndKey(key);
    return db.findByPrefix(valueKey + valuePrefix, valueKey.length());
  }

  @Override
  public void close() throws IOException {
    db.close();
  }

  private String getKeyPrefixForUser() {
    return "__USER_KEY@@__KEY";
  }

  private String getKeyPrefixForUserAndKey(String key) {
    return Joiner.on("@@").join("__USER_KEY", key);
  }

  private String getKeyPrefixForEventType(String eventType) {
    return Joiner.on("@@").join(eventType, "__KEY");
  }

  private String getKeyPrefixForEventTypeAndKey(String eventType, String key) {
    return Joiner.on("@@").join(eventType, key);
  }
}
