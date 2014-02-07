package com.mobicrave.eventtracker.list;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import com.google.common.cache.RemovalListener;
import com.google.common.cache.RemovalNotification;
import com.mobicrave.eventtracker.base.Schema;

import java.io.Closeable;
import java.io.File;
import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.ByteBuffer;
import java.nio.MappedByteBuffer;
import java.nio.channels.FileChannel;

/**
 * numRecordsPerFile * schema.getObjectSize() can't exceed MappedByteBuffer size limit, i.e.
 * numRecordsPerFile < (2^31 - 1) / schema.getObjectSize()
 */
public class DmaList<T> implements Closeable {
  private final String directory;
  private final Schema<T> schema;
  private final MappedByteBuffer metaDataBuffer;
  private LoadingCache<Integer, MappedByteBuffer> buffers;
  private long numRecords;
  private int numRecordsPerFile;

  public DmaList(String directory, Schema<T> schema, MappedByteBuffer metaDataBuffer,
      LoadingCache<Integer, MappedByteBuffer> buffers, long numRecords, int numRecordsPerFile) {
    this.directory = directory;
    this.schema = schema;
    this.metaDataBuffer = metaDataBuffer;
    this.buffers = buffers;
    this.numRecords = numRecords;
    this.numRecordsPerFile = numRecordsPerFile;
  }

  public void add(T t) {
    int currentBufferIndex = (int) (numRecords / numRecordsPerFile);
    MappedByteBuffer buffer = buffers.getUnchecked(currentBufferIndex);
    buffer.position((int) (numRecords % numRecordsPerFile) * schema.getObjectSize());
    buffer.put(schema.toBytes(t));
    metaDataBuffer.putLong(0, ++numRecords);
  }

  public T get(long kthRecord) {
    int objectSize = schema.getObjectSize();
    byte[] bytes = new byte[objectSize];
    ByteBuffer newBuffer = buffers.getUnchecked((int) (kthRecord / numRecordsPerFile)).duplicate();
    newBuffer.position((int) (kthRecord % numRecordsPerFile) * objectSize);
    newBuffer.get(bytes, 0, objectSize);
    return schema.fromBytes(bytes);
  }

  public byte[] getBytes(long kthRecord) {
    int objectSize = schema.getObjectSize();
    byte[] bytes = new byte[objectSize];
    ByteBuffer newBuffer = buffers.getUnchecked((int) (kthRecord / numRecordsPerFile)).duplicate();
    newBuffer.position((int) (kthRecord % numRecordsPerFile) * objectSize);
    newBuffer.get(bytes, 0, objectSize);
    return bytes;
  }

  public long getNumRecords() {
    return numRecords;
  }

  @Override
  public void close() {
    buffers.invalidateAll();
  }

  private static MappedByteBuffer createNewBuffer(String directory, int bufferIndex, int fileSize) {
    try {
      RandomAccessFile raf = new RandomAccessFile(String.format("%s/dma_list_%d.mem", directory,
          bufferIndex), "rw");
      return raf.getChannel().map(FileChannel.MapMode.READ_WRITE, 0, fileSize);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }

  public static <T> DmaList<T> build(final Schema<T> schema, final String directory,
      final int numRecordsPerFile) {
    try {
      //noinspection ResultOfMethodCallIgnored
      new File(directory).mkdirs();
      RandomAccessFile raf = new RandomAccessFile(new File(
          String.format("%s/meta_data.mem", directory)), "rw");
      MappedByteBuffer metaDataBuffer = raf.getChannel().map(FileChannel.MapMode.READ_WRITE, 0, 8);
      long numRecords = metaDataBuffer.getLong();
      final int fileSize = numRecordsPerFile * schema.getObjectSize();
      LoadingCache<Integer, MappedByteBuffer> buffers = CacheBuilder.newBuilder()
          .maximumSize(2048)
          .removalListener(new RemovalListener<Integer, MappedByteBuffer>() {
            @Override
            public void onRemoval(RemovalNotification<Integer, MappedByteBuffer> notification) {
              notification.getValue().force();
            }
          })
          .build(new CacheLoader<Integer, MappedByteBuffer>() {
            @Override
            public MappedByteBuffer load(Integer key) throws Exception {
              return createNewBuffer(directory, key, fileSize);
            }
          });
      return new DmaList<>(directory, schema, metaDataBuffer, buffers, numRecords, numRecordsPerFile);
    } catch (IOException e) {
      throw new RuntimeException(e);
    }
  }
}
