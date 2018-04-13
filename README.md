trifid_airdrop
===========

Message from the Trifid Team
----------------------------    
This was the code used to airdrop Trifid to a list of addresses and amounts based on our snapshot of the Neblio blockchain.

If this tool has been helpful please donate NEBL and/or NTP1 tokens to our Dev Team Wallet:
NMi41ze2XnxJrMNGtSGheGqLR3h4dabREW

Instructions
---------------------------- 
1. Clone the repository `git clone https://github.com/TrifidTeam/trifid_airdrop.git`

2. Run the following commands in the same folder:
`npm install git://github.com/NeblioTeam/bitcoinjs-lib.git#nebliojs-lib`
and
`npm install request`

3. Set up the `secrets.json` and `snapshot.csv` files as below:

secrets.json
  {
	"from_address": "<>",
	"private_key": "<>",
	"token_id": "<>"
	}
Note from_address and private_key refer to the Orion address you are sending from.
  
snapshot.csv
    address,amount
    add1,amt1
    etc.,etc.
    
4. Run addressPinger.py. This will use Neblio's insight API to check that all addresses on the list are valid (wouldn't want to distribute to an invalid address).
5. Run trifid_airdrop_code_mainnet.js. This will broadcast 10 send_token requests at a time and pause 10 seconds between each broadcast as configured.

This should run the program -- you can see the results realtime in your Orion wallet.
