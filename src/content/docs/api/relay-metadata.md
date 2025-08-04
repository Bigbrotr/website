---
title: Relay Metadata
description: The `RelayMetadata` class represents the metadata of a NOSTR relay server.
---

The `RelayMetadata` class represents the metadata of a NOSTR relay server.

## Attributes

| Name                 | Type                       | Description                                         |
| -------------------- | -------------------------- | ------------------------------------------------- |
| `relay`              | `Relay`                    | The relay object representing the relay connection. |
| `generated_at`       | `int`                      | Timestamp when the metadata was generated.         |
| `connection_success` | `bool`                     | Whether the connection to the relay was successful.|
| `nip11_success`      | `bool`                     | Whether NIP-11 metadata was successfully retrieved.|
| `openable`           | `Optional[bool]`           | Whether the relay connection can be opened.        |
| `readable`           | `Optional[bool]`           | Whether the relay supports reading.                 |
| `writable`           | `Optional[bool]`           | Whether the relay supports writing.                 |
| `rtt_open`           | `Optional[int]`            | Round-trip time for opening connection in ms.      |
| `rtt_read`           | `Optional[int]`            | Round-trip time for reading in ms.                  |
| `rtt_write`          | `Optional[int]`            | Round-trip time for writing in ms.                  |
| `name`               | `Optional[str]`            | Name of the relay.                                   |
| `description`        | `Optional[str]`            | Description of the relay.                            |
| `banner`             | `Optional[str]`            | URL to the banner image.                             |
| `icon`               | `Optional[str]`            | URL to the icon image.                               |
| `pubkey`             | `Optional[str]`            | Public key of the relay operator.                    |
| `contact`            | `Optional[str]`            | Contact information for the relay.                   |
| `supported_nips`     | `Optional[List[int or str]]` | List of supported NIPs.                            |
| `software`           | `Optional[str]`            | Name of the software the relay is running.           |
| `version`            | `Optional[str]`            | Version of the relay software.                       |
| `privacy_policy`     | `Optional[str]`            | URL to the privacy policy.                           |
| `terms_of_service`   | `Optional[str]`            | URL to the terms of service.                         |
| `limitation`         | `Optional[Dict[str, Any]]` | Dictionary of relay limitations.                     |
| `extra_fields`       | `Optional[Dict[str, Any]]` | Additional custom fields for metadata.              |

## Methods

### `__init__`
Initialize a RelayMetadata object.
#### Parameters
- `relay`: `Relay`, the relay object.
- `generated_at`: `int`, the timestamp when the metadata was generated.
- `connection_success`: `bool`, indicates if the connection to the relay was successful.
- `nip11_success`: `bool`, indicates if the NIP-11 metadata was successfully retrieved.
- `openable`: `Optional[bool]`, indicates if the relay connection can be opened.
- `readable`: `Optional[bool]`, indicates if the relay supports reading.
- `writable`: `Optional[bool]`, indicates if the relay supports writing.
- `rtt_open`: `Optional[int]`, round-trip time for connection opening.
- `rtt_read`: `Optional[int]`, round-trip time for reading.
- `rtt_write`: `Optional[int]`, round-trip time for writing.
- `name`: `Optional[str]`, the name of the relay.
- `description`: `Optional[str]`, a description of the relay.
- `banner`: `Optional[str]`, URL of the banner image.
- `icon`: `Optional[str]`, URL of the icon image.
- `pubkey`: `Optional[str]`, public key of the relay operator.
- `contact`: `Optional[str]`, contact information for the relay.
- `supported_nips`: `Optional[List[int or str]]`, list of supported NIPs.
- `software`: `Optional[str]`, software used by the relay.
- `version`: `Optional[str]`, version of the software.
- `privacy_policy`: `Optional[str]`, URL of the privacy policy.
- `terms_of_service`: `Optional[str]`, URL of the terms of service.
- `limitation`: `Optional[Dict[str, Any]]`, relay limitations.
- `extra_fields`: `Optional[Dict[str, Any]]`, additional fields for custom metadata.
#### Example
```python
>>> relay = Relay("wss://relay.example.com")
>>> relay_metadata = RelayMetadata(
        relay=relay,
        generated_at=1612137600,
        connection_success=True,
        nip11_success=True,
        openable=True,
        readable=True,
        writable=True,
        rtt_open=120,
        rtt_read=80,
        rtt_write=90,
        name="Example Relay",
        description="An example NOSTR relay",
        banner="https://example.com/banner.png",
        icon="https://example.com/icon.png",
        pubkey="abcdef1234567890",
        contact="contact@example.com",
        supported_nips=[1, 2, 3],
        software="nostr-relay-software",
        version="1.0.0",
        privacy_policy="https://example.com/privacy",
        terms_of_service="https://example.com/terms",
        limitation={"max_connections": 100},
        extra_fields={"custom_field": "value"}
    )
```
#### Returns
- `RelayMetadata`: RelayMetadata object initialized with the provided parameters.
#### Raises
- `TypeError`: If any input is of the wrong type.
- `TypeError`: If `limitations` or `extra_fields` keys are not strings.
- `TypeError`: If `supported_nips` contains non int or str elements.
---

### `__repr__`
Return a string representation of the RelayMetadata object showing all non-None attributes.
#### Example
```python
>>> relay_metadata = RelayMetadata(
        relay=Relay("wss://relay.example.com"),
        generated_at=1612137600,
        connection_success=False,
        nip11_success=False
    )
>>> print(relay_metadata)
RelayMetadata(relay=Relay(url="wss://relay.example.com", network="clearnet"), generated_at=1612137600, connection_success=False, nip11_success=False)
```
#### Returns
- `str`: String representation of the RelayMetadata object.
#### Raises
- `None`
---

### `from_dict`
Creates a RelayMetadata object from a dictionary.
#### Parameters
- `data`: `dict`, dictionary representation of the RelayMetadata object.
#### Example
```python
>>> data = {
        "relay": Relay("wss://relay.example.com"),
        "generated_at": 1612137600,
        "connection_success": False,
        "nip11_success": False
    }
>>> RelayMetadata.from_dict(data)
RelayMetadata(relay=Relay(url="wss://relay.example.com", network="clearnet"), generated_at=1612137600, connection_success=False, nip11_success=False)
```
#### Returns
- `RelayMetadata`: RelayMetadata object created from the dictionary.
#### Raises
- `TypeError`: If `data` is not a dict.
- `KeyError`: If `data` does not contain the required keys.
---

### `to_dict`
Return a dictionary representation of the RelayMetadata object.
#### Example
```python
relay_metadata = RelayMetadata(
    relay=Relay("wss://relay.example.com"),
    generated_at=1612137600,
    connection_success=False,
    nip11_success=False
)
print(relay_metadata.to_dict())
{'relay': Relay(url="wss://relay.example.com", network="clearnet"), 'generated_at': 1612137600, 'connection_success': False, 'nip11_success': False}
```
#### Returns
- `dict`: Dictionary representation of the RelayMetadata object.
#### Raises
- `None`
---