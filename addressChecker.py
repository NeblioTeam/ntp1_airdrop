import json
import requests
import time
import pandas as pd

invalid_addrs = []
mainnet_url = 'https://ntp1node.nebl.io/ins/addr/'
testnet_url = 'https://ntp1node.nebl.io/testnet/ins/addr/'
api_url = ''
debug = False

def pingAddress(addy):
	global api_url
	global debug

	try:
		# try to validate the address via API
		url = api_url + str(addy)
		resp = requests.get(url).text
		returnValue = json.loads(resp)
		balance = float(returnValue['balance'])
		print('Address: ' + str(addy) + ": " + str(returnValue['balance']))
	except Exception as e:
		# if validation fails, print error and add address to invalid list
		if debug:
			print(e)
			print('Error from API call for ' + str(addy))
			print(resp)
		invalid_addrs.append(str(addy))
	return addy

def runProgram():
	global api_url
	global debug

	# load secrets.json
	f = open('secrets.json')
	secrets = json.load(f)
	if secrets['network'] == 'testnet':
		api_url = testnet_url
	elif secrets['network'] == 'mainnet':
		api_url = mainnet_url
	else:
		raise Exception('Invalid Network: ' + secrets['network'])
	debug = secrets['debug']

	print("Network: " + str(secrets['network']))
	print("Debug: " + str(secrets['debug']))
	print("--------")

	# Load in CSV file of addresses to check
	snapshot = pd.read_csv('snapshot.csv')

	# validate each address in the list
	for index, row in snapshot.iterrows():
		address = pingAddress(row[0])

	# dump valid list
	print('\n\n\n\n----VALID LIST----')
	print('address,amount')
	for index, row in snapshot.iterrows():
		if row[0] not in invalid_addrs:
			print(str(row[0])+','+str(row[1]))

	#dump invalid list
	if len(invalid_addrs) > 0:
		print('\n\n\n\n----INVALID LIST----')
	for a in invalid_addrs:
		print(a)


runProgram()