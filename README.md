ntp1_airdrop
===========

This repository has been forked from the excellent work done by the Trifid Team. It has been updated, optimized, and new features have been added to make it easier to airdrop NTP1 tokens to Neblio addresses. If this script helped you successfully execute an NTP1 airdrop, please consider downating to the Trifid Team at the address below. 


> Original Message from the Trifid Team
> ----------------------------    
> This was the code used to airdrop Trifid to a list of addresses and amounts based on our snapshot of the Neblio blockchain.

> If this tool has been helpful please donate NEBL and/or NTP1 tokens to our Dev Team Wallet:
> NMi41ze2XnxJrMNGtSGheGqLR3h4dabREW

Instructions
---------------------------- 
1. Clone the repository `git clone https://github.com/NeblioTeam/ntp1_airdrop.git`

2. Run the following commands:

`cd ntp1_airdrop`

`npm install request-promise`

`npm install git://github.com/NeblioTeam/bitcoinjs-lib.git#nebliojs-lib`


3. Set up the `secrets.json` and `snapshot.csv` files as below:

secrets.json
```
{
    "from_address": "<>",
    "private_key": "<>",
    "token_id": "<>",
    "network": "mainnet",
    "debug": false
}
```

Note from_address and private_key refer to the address you are sending the NTP1 tokens from.
  
snapshot.csv
```
    address,amount
    add1,amt1
    etc.,etc.
```
    
4. Run addressChecker.py. This will use Neblio's insight API to check that all addresses on the list are valid. At the end of running it will print out a list of valid addresses in the snapshot.csv format, as well as a list of invalid addresses. The valid list can be copy & pasted into snapshot.csv to clear out any invalid addresses.

5. Once you are 100% sure all addresses are valid, Run `node ntp1_airdrop.js`. This will broadcast 25 send_token requests at a time and pause to wait for 1 block confirmation before proceeding to the next 25.


