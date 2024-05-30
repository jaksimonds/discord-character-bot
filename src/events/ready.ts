import path from 'path'
import { Events } from 'discord.js'
import { writeFile } from 'fs'

export const	name = Events.ClientReady
export const once = true
export const execute = async (client) => {
	console.log(`Ready! Logged in as ${client.user.tag}`)
	try {
		if (process?.env?.ELEVEN_LABS_API_KEY) {
			const elevenLabsFilename = path.join(__dirname, '../voices/elevenLabsVoices.json')
			await fetch('https://api.elevenlabs.io/v1/voices')
				.then((response) => response.json()
					.then((data) => {
						writeFile(elevenLabsFilename, JSON.stringify(data), 'utf8', (error) => {
							if (error)
								console.log(error)
							else {
								console.log("Eleven Labs voices file written successfully")
							}
						})
					})
				)
		}
		if (process?.env?.AZURE_SPEECH_KEY && process?.env?.AZURE_SPEECH_REGION) {
			const azureSpeechFilename = path.join(__dirname, '../voices/azureSpeechVoices.json')
			await fetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
				method: 'GET',
				headers: {
					'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY
				}
			}).then((response) => response.json()
				.then((data) => {
					writeFile(azureSpeechFilename, JSON.stringify(data), 'utf8', (error) => {
						if (error)
							console.log(error)
						else {
							console.log("Azure voices file written successfully")
						}
					})
				})
			)
		}

		const openaiSpeechFilename = path.join(__dirname, '../voices/openaiSpeechVoices.json')
		const openaiSpeechVoices = [
			{
				name: 'Alloy',
				id: 'alloy'
			},
			{
				name: 'Echo',
				id: 'echo'
			},
			{
				name: 'Fable',
				id: 'fable'
			},
			{
				name: 'Onyx',
				id: 'onyx'
			},
			{
				name: 'Nova',
				id: 'nova'
			},
			{
				name: 'Shimmer',
				id: 'shimmer'
			},
		]
		writeFile(openaiSpeechFilename, JSON.stringify(openaiSpeechVoices), 'utf8', (error) => {
			if (error)
				console.log(error)
			else {
				console.log("OpenAI voices file written successfully")
			}
		})
	} catch (error) {
		console.log(error)
	}
}
