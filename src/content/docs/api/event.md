---
title: Event
description: The `Event` class represents a single NOSTR event.
---

The `Event` class represents a single NOSTR event.

## Attributes
| Name           | Type                | Description                                                             |
|----------------|---------------------|-------------------------------------------------------------------------|
| `id`           | `str`               | Unique identifier of the event, derived from event fields.              |
| `pubkey`       | `str`               | Public key of the event creator.                                        |
| `created_at`   | `int`               | Unix timestamp for when the event was created.                          |
| `kind`         | `int`               | Integer representing the type of event (0–65535).                       |
| `tags`         | `List[List[str]]`   | List of tag lists, each tag is a list of strings.                       |
| `content`      | `str`               | Text or JSON content of the event.                                      |
| `sig`          | `str`               | Cryptographic signature of the event.                                   |
| `content_obj`  | `dict` or `None`    | Parsed JSON object if `content` is valid JSON, otherwise `None`.        |

---

## Methods

### `__init__`
Initialize an Event object.

#### Parameters
- `id` (`str`): ID of the event, must be a 64-character hex string matching the calculated event ID.
- `pubkey` (`str`): Public key of the event creator, 64-character hex string.
- `created_at` (`int`): Unix timestamp of when the event was created (must be positive).
- `kind` (`int`): Event type, integer between 0 and 65535.
- `tags` (`List[List[str]]`): Tags associated with the event; each tag is a list of strings.
- `content` (`str`): Event content, raw string (JSON or plain text).
- `sig` (`str`): Cryptographic signature, 128-character hex string.

#### Example
```python
>>> id = "0x123"
>>> pubkey = "0x123"
>>> created_at = 1612137600
>>> kind = 0
>>> tags = [["tag1", "tag2"]]
>>> content = "content"
>>> sig = "0x123"
>>> event = Event(id, pubkey, created_at, kind, tags, content, sig)
```

#### Returns
- `Event`: Event object initialized with the provided parameters.

#### Raises
- `TypeError`: If any input parameter has an incorrect type.
- `ValueError`: If `kind` is out of range, or if ID, pubkey, or signature lengths are incorrect.
- `ValueError`: If `created_at` is negative.
- `ValueError`: If the event ID or signature is invalid based on verification.

---

### `__repr__`
Return a string representation of the Event object.

#### Parameters
- `None`

#### Example
```python
>>> event = Event(id, pubkey, created_at, kind, tags, content, sig)
>>> event
Event(id=0x123, pubkey=0x123, created_at=1612137600, kind=0, tags=[["tag1", "tag2"]], content=content, sig=0x123)
```

#### Returns
- `str`: String representation of the Event object.

---

### `from_dict`
Create an Event object from a dictionary.

#### Parameters
- `data` (`dict`): Dictionary with keys `"id"`, `"pubkey"`, `"created_at"`, `"kind"`, `"tags"`, `"content"`, and `"sig"`.

#### Example
```python
>>> data = {"id": "0x123", "pubkey": "0x123", "created_at": 1612137600, "kind": 0, "tags": [["tag1", "tag2"]], "content": "content", "sig": "0x123"}
>>> event = Event.from_dict(data)
Event(id=0x123, pubkey=0x123, created_at=1612137600, kind=0, tags=[["tag1", "tag2"]], content=content, sig=0x123)
```

#### Returns
- `Event`: Event object created from the dictionary.

#### Raises
- `TypeError`: If `data` is not a dictionary.
- `KeyError`: If any required key is missing in `data`.

---

### `to_dict`
Return a dictionary representation of the Event object.

#### Parameters
- `None`

#### Example
```python
>>> event = Event(id, pubkey, created_at, kind, tags, content, sig)
>>> event.to_dict()
{'id': '0x123', 'pubkey': '0x123', 'created_at': 1612137600, 'kind': 0, 'tags': [['tag1', 'tag2']], 'content': 'content', 'sig': '0x123', 'content_obj': None}
```

#### Returns
- `dict`: Dictionary representation of the Event object, including `content_obj`.

---
