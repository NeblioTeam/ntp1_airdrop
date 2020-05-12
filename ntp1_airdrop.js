var bitcoin = require('bitcoinjs-lib');
var request = require('request-promise');
var fs = require("fs");

var issuance_address
var issuance_privkey
var token_id
var network
var debug
var api_url

var testnet_url = 'https://ntp1node.nebl.io/testnet/ntp1/'
var mainnet_url = 'https://ntp1node.nebl.io/ntp1/'

var broadcast_retry_count = 0


const waitFor = (ms) => new Promise(r => setTimeout(r, ms))

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}


async function postToApi(api_endpoint, json_data, retry=true) {
	if (debug) {
    	console.log(api_endpoint+': ', JSON.stringify(json_data));
    }
    var result = await request.post({
        url: api_url + api_endpoint,
        headers: {'Content-Type': 'application/json'},
        form: json_data,
        resolveWithFullResponse: true,
        simple: false // allow non HTTP 2XX status codes
    });
    if (debug){
    	console.log(api_endpoint+': Status:', result.statusCode)
    	console.log(api_endpoint+' Result:  %o', result.body)
    }
    if (result.statusCode != 200 && retry){
    	broadcast_retry_count = broadcast_retry_count + 1
    	if (broadcast_retry_count < 20) {
    		console.log("API Post failed with " + result.statusCode + " Sleeping 5 secs and retrying.")
    		await waitFor(5000);
			await postToApi(api_endpoint, json_data, true)
			return
		} else {
			console.log("API Post failed 20 times. Please investigate.")
			return
		}
    } else {
    	// reset retry counter as the post was successful
    	broadcast_retry_count = 0
    	return result.body
    }

}

async function getTxnFromApi(txid) {
	if (debug) {
    	console.log("Getting Transaction: " + txid);
    }
    var result = await request.get({
        url: api_url + 'transactioninfo/' + txid,
        headers: {'accept': 'application/json'},
        resolveWithFullResponse: true,
        simple: false // allow non HTTP 2XX status codes
    });

    if (debug){
    	console.log('Get Transaction Status:', result.statusCode)
    	console.log('Get Transaction Result:  %o', result.body)
    }
    return result.body
}


async function verifyTxn(txid, transaction) {
	var transaction_info_resp = await getTxnFromApi(txid)
	// // we'll get an error until there is a confirmation
	// if (transaction_info_resp.confirmations < 1) {
	// 	await waitFor(5000);
	// 	// re-broadcast
	// 	var broadcast_resp = await postToApi('broadcast', transaction, false)
	// 	broadcast_resp = JSON.parse(broadcast_resp)

	// 	await verifyTxn(txid, transaction)
	// 	return
	// }

	// parse JSON
	transaction_info_resp = JSON.parse(transaction_info_resp)

	if (debug) {
		console.log("Conf: " + transaction_info_resp.confirmations)
	}
	if (typeof transaction_info_resp.confirmations == 'undefined' || transaction_info_resp.confirmations < 1) {
		await waitFor(5000);
		// re-broadcast
		var broadcast_resp = await postToApi('broadcast', transaction, false)
		broadcast_resp = JSON.parse(broadcast_resp)

		await verifyTxn(txid, transaction)
	} else {
		return txid
	}
}

function signTx (unsignedTx, wif) {
    var privateKey = bitcoin.ECKey.fromWIF(wif);
    var tx = bitcoin.Transaction.fromHex(unsignedTx);
    var insLength = tx.ins.length;
    for (var i = 0; i < insLength; i++) {
        tx.sign(i, privateKey);
    }
    return tx.toHex();
};


function readInFiles () {
	//Load in JSON variables for from_address and private_key
	//from secrets.json
    var contents = fs.readFileSync("secrets.json");
    var secrets = JSON.parse(contents);

    issuance_address = secrets.from_address;
    issuance_privkey = secrets.private_key;
    token_id = secrets.token_id;
    network = secrets.network;
    debug = secrets.debug;

    console.log("From: ", issuance_address);
    //Hide private key from console unless in debug mode
    if (debug) {
    	console.log("Private Key: ", issuance_privkey);
    } else {
    	console.log("Private Key: ****************************************************");
    }
    console.log("Token ID: ", token_id);
    console.log("Network: ", network);
    console.log("Debug: ", debug);
    console.log("----------------")

    if (network == 'testnet'){
    	api_url = testnet_url;
    } else if (network == 'mainnet'){
    	api_url = mainnet_url;
    } else {
    	console.log("Invalid network: " + network)
    	return
    }

    //Load in CSV file of txns to send
    var fileContents = fs.readFileSync('snapshot.csv');
    //Had to remove carriage return \r.. might be a mac thing
    var lines = fileContents.toString().replace(/[\r]+/g, '').split('\n');

    var result = [];
    var headers=lines[0].split(",");
    for(var i=1;i<lines.length;i++){
    	if (lines[i].length > 0 && lines[i].trim() && !lines[i].startsWith('----')) {
    		var obj = {};
    		var currentline=lines[i].split(",");
    		for(var j=0;j<headers.length;j++){
    			obj[headers[j]] = currentline[j];
    			obj['tokenId'] = token_id;
    		};
    		result.push(obj);
    	}
    };
    return [result,issuance_address,issuance_privkey];
};

async function submitTxn(send_token, issuance_privkey, num) {

	// craft our raw transaction
	var send_resp = await postToApi('sendtoken', send_token)
	send_resp = JSON.parse(send_resp)

	// sign transaction with private key
	var signed = signTx(send_resp.txHex, issuance_privkey);
	var transaction = {'txHex': signed};

    // broadcast transaction to the Neblio network
    var broadcast_resp = await postToApi('broadcast', transaction)
    try {
    	broadcast_resp = JSON.parse(broadcast_resp)
    } catch (err) {
    	console.log("Broadcast response not as expected, retrying...")
    	await waitFor(5000);
    	broadcast_resp = await postToApi('broadcast', transaction)
    	broadcast_resp = JSON.parse(broadcast_resp)
    }

    var txid = broadcast_resp.txid
    console.log("Transaction " + txid + " sent. Waiting for confirmation...")

    // verify transaction is confirmed
    var verify_resp = await verifyTxn(txid, transaction)
    console.log("Transaction " + txid + " confirmed!")
    return verify_resp
};

var numTxnsPerCall = 25; // 25 addresses per txn. WARNING: It is NOT recommended to exceed 25/txn
var starti = 0;
var endi = numTxnsPerCall;
var values = readInFiles();
var addressSet = values[0];
var issuance_address = values[1];
var issuance_privkey = values[2];
var maxIter = Math.ceil(addressSet.length / numTxnsPerCall);
var flags = {'splitChange': true}


iter = Array.from({length: maxIter}, (v, k) => k+1);

const start = async () => {

  await asyncForEach(iter, async (num) => {
    var iter_txn = {
        'from': [issuance_address],
        'fee': 20000,
        'to': addressSet.slice(starti,endi),
        'flags': flags
    };
    await console.log("Iteration: ", num, " of ", maxIter, " Starting.");
    if (debug) {
    	await console.log("Starti: ", starti);
    	await console.log("Endi: ", endi);
    }
    await submitTxn(iter_txn, issuance_privkey, num);

    starti = endi;
    endi = Math.min(endi+numTxnsPerCall, addressSet.length); //min of next batch or the end of the array
  })
}

start()