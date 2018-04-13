import json
import requests
import time
import pandas as pd

#TESTNET: https://ntp1node.nebl.io:13002/insight-api/addr/<address>
#MAINNET: https://ntp1node.nebl.io:3002/insight-api/addr/<address>

def pingAddress(addy):
	while True:
		#Wait for some time between iterations
		time.sleep(0)
		try:
			url = 'https://ntp1node.nebl.io:3002/insight-api/addr/' + str(addy)
			query_string = requests.get(url).text
			returnValue = json.loads(query_string)
			balance = float(returnValue['balance'])
			print('Address: ' + str(addy) + ": " + str(returnValue['balance']))
			break
		except Exception as e:
			#if getting one of the prices failed
			print(e)
			print('Error from API call, retrying...')
			continue
	return balance

def runProgram():
	#Load in CSV file of addresses to ping
    #Note csv file looks like:
    #address,amount
    #add1,amt1
    #etc,etc
	snapshot = pd.read_csv('snapshot.csv')
	#print(snapshot)

	for index, row in snapshot.iterrows():
		address = pingAddress(row[0])

runProgram()