---
title: Utils
description: A collection of utility functions for handling NOSTR keys, events, signatures, Proof of Work, Bech32 encoding, URI parsing, and relay URL extraction.
---

A collection of utility functions designed to assist with NOSTR protocol tasks including key generation, event creation and signing, signature verification, Proof of Work (PoW), Bech32 encoding/decoding, URI validation, and relay URL extraction.

## Functions

### `calc_event_id`  
Calculate the event ID based on event parameters.
#### Parameters
- `pubkey` (`str`): The user's public key in hex format.
- `created_at` (`int`): Timestamp of the event creation.
- `kind` (`int`): The event kind/type.
- `tags` (`list`): List of tags associated with the event.
- `content` (`str`): The main content of the event.
#### Example
```python
>>> calc_event_id('pubkey', 1234567890, 1, [['tag1', 'tag2']], 'Hello, World!')  
'e41d2f51b631d627f1c5ed83d66e1535ac0f1542a94db987c93f758c364a7600'
```
#### Returns
- `str`: SHA-256 hash (hexadecimal string) representing the event ID.
#### Raises
- `None`
---

### `sig_event_id`  
Sign an event ID using the private key.
#### Parameters
- `event_id` (`str`): Event ID to sign.
- `private_key_hex` (`str`): Private key in hex format.
#### Example
```python
>>> sig_event_id('eventidhexstring', 'privatekeyhexstring')  
'signaturehexstring'
```
#### Returns
- `str`: The Schnorr signature as hex string.
#### Raises
- `None`
---

### `verify_sig`  
Verify a signature for an event ID.
#### Parameters
- `event_id` (`str`): The event ID to verify.
- `pubkey` (`str`): The public key in hex.
- `sig` (`str`): The signature hex string.
#### Example
```python
>>> verify_sig('eventidhex', 'pubkeyhex', 'signaturehex')  
True
```
#### Returns
- `bool`: True if signature valid, False otherwise.
#### Raises
- `None`
---

### `generate_event`  
Generate an event with optional Proof of Work.
#### Parameters
- `sec` (`str`): Private key hex for signing.
- `pub` (`str`): Public key hex.
- `kind` (`int`): Event kind.
- `tags` (`list`): Event tags.
- `content` (`str`): Event content.
- `created_at` (`int` | `None`): Timestamp (default now).
- `target_difficulty` (`int` | `None`): PoW difficulty (leading zero bits).
- `timeout` (`int`): Max seconds for PoW mining.
#### Example
```python
>>> generate_event('privkeyhex', 'pubkeyhex', 1, [['tag1']], 'Hello!')
```
#### Returns
- `dict`: Event dictionary with id, pubkey, created_at, kind, tags, content, sig.
#### Raises
- `None`
---

### `generate_nostr_keypair`  
Generate a new NOSTR key pair.
#### Returns
- `tuple[str, str]`: (private_key_hex, public_key_hex)
---

### `test_keypair`  
Test if private key matches the public key.
#### Parameters
- `seckey` (`str`): Private key hex.
- `pubkey` (`str`): Public key hex.
#### Returns
- `bool`: True if keys match, False otherwise.
---

### `to_bech32`  
Convert a hex string to Bech32.
#### Parameters
- `prefix` (`str`): Bech32 prefix (e.g. 'nsec', 'npub').
- `hex_str` (`str`): Hexadecimal string to convert.
#### Returns
- `str`: Bech32 encoded string.
---

### `to_hex`  
Convert a Bech32 string back to hex.
#### Parameters
- `bech32_str` (`str`): Bech32 encoded string.
#### Returns
- `str`: Hexadecimal string.
---

### `find_websoket_relay_urls`  
Extract WebSocket relay URLs from text.
#### Parameters
- `text` (`str`): Text containing URLs.
#### Example
```python
>>> find_websoket_relay_urls("Connect to wss://relay.example.com:443 and ws://relay.example.com")  
['wss://relay.example.com:443', 'wss://relay.example.com']
```
#### Returns
- `list[str]`: List of valid WebSocket relay URLs.
---

### `sanitize`  
Sanitize strings or nested data structures by escaping null byte representations.
#### Parameters
- `value` (`str|list|dict`): Value to sanitize.
#### Returns
- Sanitized version of the input with escaped null byte sequences.
---