---
title: Bigbrotr
description: The `Bigbrotr` class manages connections and interactions with the Bigbrotr database.
---

The `Bigbrotr` class manages connections and interactions with the Bigbrotr database.

## Attributes
| Name       | Type                    | Description                                  |
|------------|-------------------------|----------------------------------------------|
| `host`     | `str`                   | Database host                                |
| `port`     | `int`                   | Database port                                |
| `user`     | `str`                   | Database user                                |
| `password` | `str`                   | Password for database access                 |
| `dbname`   | `str`                   | Database name                                |
| `conn`    | `psycopg2.connection`   | Database connection object                    |
| `cur`     | `psycopg2.cursor`       | Cursor to execute queries on the database    |

---

## Methods

### `__init__`
Initialize a Bigbrotr object.

#### Parameters
- `host` (`str`): Database host  
- `port` (`int`): Database port  
- `user` (`str`): Database user  
- `password` (`str`): Password for database access  
- `dbname` (`str`): Database name  

#### Example
```python
>>> bigbrotr = Bigbrotr("localhost", 5432, "admin", "admin", "bigbrotr")
```

#### Raises
- `TypeError`: If any parameter is of incorrect type.

---

### `connect`
Establish connection to the database.

#### Parameters
- `None`

#### Example
```python
>>> bigbrotr.connect()
```

#### Returns
- `None`

---

### `close`
Close the database connection.

#### Parameters
- `None`

#### Example
```python
>>> bigbrotr.close()
```

#### Returns
- `None`

---

### `commit`
Commit the current transaction.

#### Parameters
- `None`

#### Example
```python
>>> bigbrotr.commit()
```

#### Returns
- `None`

---

### `execute`
Execute an SQL query with optional arguments.

#### Parameters
- `query` (`str`): SQL query string to execute  
- `args` (`tuple`, optional): Arguments for parameterized query (default is empty tuple)  

#### Example
```python
>>> bigbrotr.execute("SELECT * FROM events WHERE kind = %s", (0,))
```

#### Raises
- `TypeError`: If `query` is not a string or `args` is not a tuple.

#### Returns
- `None`

---

### `fetchall`
Retrieve all results from the last executed query.

#### Parameters
- `None`

#### Example
```python
>>> results = bigbrotr.fetchall()
```

#### Returns
- `List[Tuple]`: List of all query results.

---

### `fetchone`
Retrieve a single result from the last executed query.

#### Parameters
- `None`

#### Example
```python
>>> result = bigbrotr.fetchone()
```

#### Returns
- `Tuple` or `None`: Single query result or `None` if no results.

---

### `fetchmany`
Retrieve a specific number of results from the last executed query.

#### Parameters
- `size` (`int`): Number of rows to fetch  

#### Example
```python
>>> results = bigbrotr.fetchmany(10)
```

#### Raises
- `TypeError`: If `size` is not an integer.

#### Returns
- `List[Tuple]`: List of query results.

---

### `delete_orphan_events`
Delete orphan events from the database.

#### Parameters
- `None`

#### Example
```python
>>> bigbrotr.delete_orphan_events()
```

#### Returns
- `None`

---

### `insert_event`
Insert a single event into the database.

#### Parameters
- `event` (`Event`): Event object to insert  
- `relay` (`Relay`): Relay source of the event  
- `seen_at` (`int`, optional): Timestamp when the event was seen (default current time)  

#### Example
```python
>>> bigbrotr.insert_event(event, relay, seen_at=1650000000)
```

#### Raises
- `TypeError`: If `event` or `relay` are of incorrect type, or if `seen_at` is not an integer.  
- `ValueError`: If `seen_at` is negative.

#### Returns
- `None`

---

### `insert_relay`
Insert a single relay into the database.

#### Parameters
- `relay` (`Relay`): Relay object to insert  
- `inserted_at` (`int`, optional): Timestamp of insertion (default current time)  

#### Example
```python
>>> bigbrotr.insert_relay(relay)
```

#### Raises
- `TypeError`: If `relay` is not a Relay instance or `inserted_at` not an integer.  
- `ValueError`: If `inserted_at` is negative.

#### Returns
- `None`

---

### `insert_relay_metadata`
Insert relay metadata into the database.

#### Parameters
- `relay_metadata` (`RelayMetadata`): Relay metadata object  

#### Example
```python
>>> bigbrotr.insert_relay_metadata(relay_metadata)
```

#### Raises
- `TypeError`: If `relay_metadata` is not a RelayMetadata instance.

#### Returns
- `None`

---

### `insert_event_batch`
Insert a batch of events into the database.

#### Parameters
- `events` (`List[Event]`): List of Event objects to insert  
- `relay` (`Relay`): Relay source  
- `seen_at` (`int`, optional): Timestamp when events were seen (default current time)  

#### Example
```python
>>> bigbrotr.insert_event_batch([event1, event2], relay)
```

#### Raises
- `TypeError`: If parameters have incorrect types.  
- `ValueError`: If `seen_at` is negative.

#### Returns
- `None`

---

### `insert_relay_batch`
Insert a batch of relays into the database.

#### Parameters
- `relays` (`List[Relay]`): List of Relay objects to insert  
- `inserted_at` (`int`, optional): Timestamp of insertion (default current time)  

#### Example
```python
>>> bigbrotr.insert_relay_batch([relay1, relay2])
```

#### Raises
- `TypeError`: If parameters have incorrect types.  
- `ValueError`: If `inserted_at` is negative.

#### Returns
- `None`

---

### `insert_relay_metadata_batch`
Insert a batch of relay metadata entries into the database.

#### Parameters
- `relay_metadata_list` (`List[RelayMetadata]`): List of RelayMetadata objects  

#### Example
```python
>>> bigbrotr.insert_relay_metadata_batch([metadata1, metadata2])
```

#### Raises
- `TypeError`: If `relay_metadata_list` is not a list of RelayMetadata instances.

#### Returns
- `None`
