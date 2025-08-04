---
title: Relay
description: The `Relay` class represents a NOSTR relay server.
---

The `Relay` class represents a NOSTR relay server.

## Attributes
| Name      | Type   | Description                                                    |
|-----------|--------|----------------------------------------------------------------|
| `url`     | `str`  | URL of the relay, must begin with `ws://` or `wss://`.         |
| `network` | `str`  | The network type of the relay, either `"clearnet"` or `"tor"`. |
---

## Methods

### `__init__`
Initialize a Relay object.
#### Parameters
- `url` (`str`): URL of the relay.
#### Example
```python
>>> url = "wss://relay.nostr.com"
>>> relay = Relay(url)
```
#### Returns
- `Relay`: Relay object initialized with the provided parameters.
#### Raises
- `TypeError`: If `url` is not a string.
- `ValueError`: If `url` does not start with `"wss://"` or `"ws://"`.
---

### `__repr__`
Return a string representation of the Relay object.
#### Parameters
- `None`
#### Example
```python
>>> relay = Relay("wss://relay.nostr.com")
>>> relay
Relay(url=wss://relay.nostr.com, network=clearnet)
```
#### Returns
- `str`: A string that shows the `url` and `network` of the relay.
#### Raises
- `None`
---

### `from_dict`
Create a Relay object from a dictionary.
#### Parameters
- `data` (`dict`): A dictionary with the key `"url"`.
#### Example
```python
>>> data = {"url": "wss://relay.nostr.com"}
>>> relay = Relay.from_dict(data)
>>> relay
Relay(url=wss://relay.nostr.com, network=clearnet)
```
#### Returns
- `Relay`: Relay object created from the dictionary.
#### Raises
- `TypeError`: If `data` is not a dictionary.
- `KeyError`: If `"url"` key is missing in the dictionary.
---

### `to_dict`
Return a dictionary representation of the Relay object.
#### Parameters
- `None`
#### Example
```python
>>> relay = Relay("wss://relay.nostr.com")
>>> relay.to_dict()
{'url': 'wss://relay.nostr.com', 'network': 'clearnet'}
```
#### Returns
- `dict`: Dictionary representation of the Relay object.
#### Raises
- `None`
---
