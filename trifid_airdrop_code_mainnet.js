var bitcoin = require('bitcoinjs-lib');
var request = require('request');
var fs = require("fs");

const waitFor = (ms) => new Promise(r => setTimeout(r, ms))

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

/*
API Links:
TESTNET: https://ntp1node.nebl.io:1443/ntp1/
MAINNET: https://ntp1node.nebl.io/ntp1/
*/
async function postToApi(api_endpoint, json_data, callback) {
    console.log(api_endpoint+': ', JSON.stringify(json_data));
    request.post({
        url: 'https://ntp1node.nebl.io/ntp1/'+api_endpoint,
        headers: {'Content-Type': 'application/json'},
        form: json_data
    },
    async function (error, response, body) {
        if (error) {
            return callback(error);
        } else if (response.statusCode != 200){
            await console.log(api_endpoint+' Failed with Status: ', response.statusCode);
            await waitFor(1000); //milliseconds, so 1000 = 1 second
            await postToApi(api_endpoint, json_data, async function(err, body){
            if (err) {
                console.log('error: ', err);
            };
        });
        } else if (typeof body === 'string') {
            body = JSON.parse(body);
        }
        await console.log(api_endpoint+': Status:', response.statusCode);
        return callback(null, body);
    });
};

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
    /*
	Load in JSON variables for from_address and private_key
	Note secrets.json file looks like:
	{
	"from_address": "<>",
	"private_key": "<>",
	"token_id": "<>"
	}
    */
    var contents = fs.readFileSync("secrets.json");
    var secrets = JSON.parse(contents);
    console.log("From: ", secrets.from_address);
    console.log("Private Key: ", secrets.private_key);
    console.log("Token ID: ", secrets.token_id);
    var issuance_address = secrets.from_address;
    var issuance_privkey = secrets.private_key;
    var token_id = secrets.token_id;

    //Load in CSV file of txns to send
    /*
    Note csv file looks like:
    address,amount
    add1,amt1
    etc,etc
    */
    var fileContents = fs.readFileSync('snapshot.csv');
    //Had to remove carriage return \r.. might be a mac thing 
    var lines = fileContents.toString().replace(/[\r]+/g, '').split('\n');
    //console.log(lines.length)
    var result = [];
    var headers=lines[0].split(",");
    for(var i=1;i<lines.length;i++){
    	var obj = {};
    	var currentline=lines[i].split(",");
    	for(var j=0;j<headers.length;j++){
    		obj[headers[j]] = currentline[j];
    		obj['tokenId'] = token_id;
    	};
    	result.push(obj);
    };
    return [result,issuance_address,issuance_privkey];
};

async function submitTxn(send_token, issuance_privkey,num) {

        postToApi('sendtoken', send_token, function(err, body){
            console.log('Raw: '+body.txHex);
            if (err) {
                console.log('error: ', err);
        };

        var signed = signTx(body.txHex, issuance_privkey);
        var transaction = {'txHex': signed};

        postToApi('broadcast', transaction, function(err, body){
            if (err) {
                console.log('error: ', err);
            };
            console.log("Iteration: ", num, " Completed.");
        });
        //waitFor(2000) //milliseconds, so 1000 = 1 second
    });
};


//ORIG SEND_TOKEN
/*
var send_token = {
    'from': [issuance_address],
    'fee': 10000,
    'to': result
};
console.log(send_token)
*/

var numTxnsPerCall = 10; //20 is max amt of txns per api call at this time.. 20 failed with some larger test amounts, moved down to 10 for safety
var starti = 0;
var endi = numTxnsPerCall;
var values = readInFiles();
var addressSet = values[0];
var issuance_address = values[1];
var issuance_privkey = values[2];
var maxIter = Math.ceil(addressSet.length / numTxnsPerCall);
//console.log(addressSet);

iter = Array.from({length: maxIter}, (v, k) => k+1); 

const start = async () => {

  await asyncForEach(iter, async (num) => {
    var iter_txn = {
        'from': [issuance_address],
        'fee': 10000,
        'to': addressSet.slice(starti,endi)
    };
    await waitFor(10000) //milliseconds, so 1000 = 1 second
    await console.log("Iteration: ", num, " of ", maxIter, "Starting.");
    await console.log("Starti: ", starti);
    await console.log("Endi: ", endi);
    await submitTxn(iter_txn, issuance_privkey, num);
    starti = endi;
    endi = Math.min(endi+numTxnsPerCall, addressSet.length); //min of next batch or the end of the array
  })
}

start()