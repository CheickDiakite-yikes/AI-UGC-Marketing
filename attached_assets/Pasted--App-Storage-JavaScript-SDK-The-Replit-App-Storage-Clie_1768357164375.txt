# App Storage JavaScript SDK

> The Replit App Storage Client is the official JavaScript SDK for managing interactions with Replit App Storage. This lets you programmatically copy, delete, upload, and download files within Replit App Storage buckets.

This reference guide explains the `Client` class from the `object-storage` library and provides code examples for its methods.

## Client

The `Client` class manages interactions with Replit App Storage. This class features methods for performing operations on files in a bucket.

To import the class from the library, add the following line to your JavaScript code:

```javascript  theme={null}
import { Client } from "@replit/object-storage";
```

Use the following code to create a `Client` instance that interacts with Replit Object Storage:

```javascript  theme={null}
const client = new Client();
```

## Constructors

**constructor**

* **new Client**(`options?`): `Client`

Creates a new Client instance to interact with Replit App Storage.

**Parameters**

| Name       | Type            | Description                                      |
| :--------- | :-------------- | :----------------------------------------------- |
| `options?` | `ClientOptions` | Configuration options for setting up the client. |

**Returns**

`Client`

## Methods

### copy

* **copy**(`objectName`, `destObjectName`): `Promise`\<`Result`\<`null`, `RequestError`>>

Copies an object within the same bucket.
This method overwrites any existing object at the destination path.

**Parameters**

| Name             | Type     | Description                          |
| :--------------- | :------- | :----------------------------------- |
| `objectName`     | `string` | The full path of the object to copy. |
| `destObjectName` | `string` | The full path to copy the object to. |

**Returns**

`Promise`\<`Result`\<`null`, `RequestError`>>

***

### delete

* **delete**(`objectName`, `options?`): `Promise`\<`Result`\<`null`, `RequestError`>>

Deletes an object from the bucket.

**Parameters**

| Name         | Type            | Description                              |
| :----------- | :-------------- | :--------------------------------------- |
| `objectName` | `string`        | The full path of the object to delete.   |
| `options?`   | `DeleteOptions` | Configurations for the delete operation. |

**Returns**

`Promise`\<`Result`\<`null`, `RequestError`>>

***

### downloadAsBytes

* **downloadAsBytes**(`objectName`, `options?`): `Promise`\<`Result`\<`Buffer`, `RequestError`>>

Downloads an object and returns its raw contents as a buffer.

**Parameters**

| Name         | Type              | Description                                |
| :----------- | :---------------- | :----------------------------------------- |
| `objectName` | `string`          | The full path of the object to download.   |
| `options?`   | `DownloadOptions` | Configurations for the download operation. |

**Returns**

`Promise`\<`Result`\<`Buffer`, `RequestError`>>

***

### downloadAsStream

* **downloadAsStream**(`objectName`, `options?`): `Readable`

Creates a readable stream of the object's contents.
The stream emits any errors encountered during the download.

**Parameters**

| Name         | Type              | Description                                |
| :----------- | :---------------- | :----------------------------------------- |
| `objectName` | `string`          | The full path of the object to download.   |
| `options?`   | `DownloadOptions` | Configurations for the download operation. |

**Returns**

`Readable`

### downloadAsText

* **downloadAsText**(`objectName`, `options?`): `Promise`\<`Result`\<`string`, `RequestError`>>

Downloads an object and returns its contents as a string.

**Parameters**

| Name         | Type              | Description                                |
| :----------- | :---------------- | :----------------------------------------- |
| `objectName` | `string`          | The full path of the object to download.   |
| `options?`   | `DownloadOptions` | Configurations for the download operation. |

**Returns**

`Promise`\<`Result`\<`string`, `RequestError`>>

### downloadToFilename

* **downloadToFilename**(`objectName`, `destFilename`, `options?`): `Promise`\<`Result`\<`null`, `RequestError`>>

Downloads an object and saves it to the specified location on the local filesystem.

**Parameters**

| Name           | Type              | Description                                                         |
| :------------- | :---------------- | :------------------------------------------------------------------ |
| `objectName`   | `string`          | The full path of the object to download.                            |
| `destFilename` | `string`          | The path on the local filesystem to write the downloaded object to. |
| `options?`     | `DownloadOptions` | Configurations for the download operation.                          |

**Returns**

`Promise`\<`Result`\<`null`, `RequestError`>>

### exists

* **exists**(`objectName`): `Promise`\<`Result`\<`boolean`, `RequestError`>>

Checks if an object exists in the bucket.

**Parameters**

| Name         | Type     | Description                           |
| :----------- | :------- | :------------------------------------ |
| `objectName` | `string` | The full path of the object to check. |

**Returns**

`Promise`\<`Result`\<`boolean`, `RequestError`>>

### getBucket

* **getBucket**(): `Promise`\<`Bucket`>

**Returns**

`Promise`\<`Bucket`>

### init

* **init**(`bucketId?`): `Promise`\<`Bucket`>

**Parameters**

| Name        | Type     |
| :---------- | :------- |
| `bucketId?` | `string` |

**Returns**

`Promise`\<`Bucket`>

### list

* **list**(`options?`): `Promise`\<`Result`\<`StorageObject`\[], `RequestError`>>

Returns a list of all objects in the bucket.

**Parameters**

| Name       | Type          | Description                            |
| :--------- | :------------ | :------------------------------------- |
| `options?` | `ListOptions` | Configurations for the list operation. |

**Returns**

`Promise`\<`Result`\<`StorageObject`\[], `RequestError`>>

### mapUploadOptions

* **mapUploadOptions**(`options?`): `undefined` | `UploadOptions`

**Parameters**

| Name       | Type            |
| :--------- | :-------------- |
| `options?` | `UploadOptions` |

**Returns**

`undefined` | `UploadOptions`

### uploadFromBytes

* **uploadFromBytes**(`objectName`, `contents`, `options?`): `Promise`\<`Result`\<`null`, `RequestError`>>

Uploads an object using its in-memory byte representation.
This method overwrites any existing object with the same name.

**Parameters**

| Name         | Type            | Description                                  |
| :----------- | :-------------- | :------------------------------------------- |
| `objectName` | `string`        | The full destination path of the object.     |
| `contents`   | `Buffer`        | The raw contents of the object in byte form. |
| `options?`   | `UploadOptions` | Configurations for the upload operation.     |

**Returns**

`Promise`\<`Result`\<`null`, `RequestError`>>

### uploadFromFilename

* **uploadFromFilename**(`objectName`, `srcFilename`, `options?`): `Promise`\<`Result`\<`null`, `RequestError`>>

Uploads a file from the local filesystem to the bucket.
This method overwrites any existing object with the same name.

**Parameters**

| Name          | Type            | Description                                             |
| :------------ | :-------------- | :------------------------------------------------------ |
| `objectName`  | `string`        | The full destination path of the object.                |
| `srcFilename` | `string`        | The path of the file on the local filesystem to upload. |
| `options?`    | `UploadOptions` | Configurations for the upload operation.                |

**Returns**

`Promise`\<`Result`\<`null`, `RequestError`>>

### uploadFromStream

* **uploadFromStream**(`objectName`, `stream`, `options?`): `Promise`\<`void`>

Uploads an object by reading its contents from the provided stream.
The stream emits any errors encountered during the upload. This method overwrites any existing object with the same name.

**Parameters**

| Name         | Type            | Description                                                 |
| :----------- | :-------------- | :---------------------------------------------------------- |
| `objectName` | `string`        | The full destination path of the object.                    |
| `stream`     | `Readable`      | A readable stream from which to read the object's contents. |
| `options?`   | `UploadOptions` | Configurations for the upload operation.                    |

**Returns**

`Promise`\<`void`>

### uploadFromText

* **uploadFromText**(`objectName`, `contents`, `options?`): `Promise`\<`Result`\<`null`, `RequestError`>>

Uploads an object using its in-memory text representation.
This method overwrites any existing object with the same name.

**Parameters**

| Name         | Type            | Description                              |
| :----------- | :-------------- | :--------------------------------------- |
| `objectName` | `string`        | The full destination path of the object. |
| `contents`   | `string`        | The contents of the object in text form. |
| `options?`   | `UploadOptions` | Configurations for the upload operation. |

**Returns**

`Promise`\<`Result`\<`null`, `RequestError`>>

## Method examples

The following sections provide code examples for managing your files using the Replit Object Storage SDK.

### Retrieve an object as text

```javascript  theme={null}
const { ok, value: textValue, error } = await client.downloadAsText('file.json');
if (!ok) {
    // ... handle error ...
}
```

### Retrieve an object as its raw byte representation

```javascript  theme={null}
const { ok, value: bytesValue, error } = await client.downloadAsBytes('file.png');
if (!ok) {
    // ... handle error ...
}
```

### Retrieve an object from a stream

```javascript  theme={null}
const { ok, value: stream, error } = await client.downloadAsStream('file.json');
if (!ok) {
    // ... handle error ...
}
```

### Download an object to the filesystem

```javascript  theme={null}
const { ok, error } = await client.downloadToFilename('file.json', destFilename);
if (!ok) {
    // ... handle error ...
}
```

### List objects in the bucket

```javascript  theme={null}
const { ok, value, error } = await client.list();
if (!ok) {
    // ... handle error ...
}
```

### Upload an object from text

```javascript  theme={null}
const { ok, error } = await client.uploadFromText('file.json', data);
if (!ok) {
    // ... handle error ...
}
```

### Upload an object as bytes

```javascript  theme={null}
const { ok, error } = await client.uploadFromBytes('file.png', data);
if (!ok) {
    // ... handle error ...
}
```

### Upload an object from the filesystem

```javascript  theme={null}
const { ok, error } = await client.uploadFromFilename('file.json', srcFilename);
if (!ok) {
    // ... handle error ...
}
```

### Upload an object from a stream

```javascript  theme={null}
const { ok, error } = await client.uploadFromStream('file.json', stream);
if (!ok) {
    // ... handle error ...
}
```

### Delete an object from the bucket

```javascript  theme={null}
const { ok, error } = await client.delete('file.json');
if (!ok) {
    // ... handle error ...
}
```


---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://docs.replit.com/llms.txt