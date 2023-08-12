import { SlashCommandBuilder } from 'discord.js'
import { joinVoiceChannel } from '@discordjs/voice'
import { subscribeToUser } from '../../utils'

export const data = new SlashCommandBuilder()
	.setName('add')
	.setDescription('Adds character to voice call.')
	.addStringOption(option =>
		option.setName('name')
			.setDescription('The name of the character to message')
			.setRequired(true))
	.addStringOption(option =>
		option.setName('channel')
			.setDescription('The name of the channel the character will join')
			.setRequired(true))
	.addBooleanOption(option =>
		option.setName('open')
			.setDescription('Sets if the call is open mic or not'))

export const execute = async (interaction) => {
	try {
		const characterName = interaction.options.getString('name')
		const voiceChannelName = interaction.options.getString('channel')
		const open = interaction.options.getBoolean('open')

		const characterChannel = interaction.client.channels.cache.find(channel => channel.name === `character-${characterName.toLowerCase()}`)
		const voiceChannel = interaction.client.channels.cache.find(channel => channel.name === voiceChannelName)
		const openMessage = voiceChannel?.messages?.cache.find(message => message.content.includes('Open: '))
		const openValue = openMessage?.content?.replace('Open: ', '')
		const guild = interaction.client.guilds.cache.get(voiceChannel.guildId)

		const connection = joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: guild.id,
			adapterCreator: guild.voiceAdapterCreator,
			selfMute: false,
			selfDeaf: false,
		})

		connection.receiver.speaking.on('start', async (user) => {
			const userObject = guild.members.cache.find(member => member.user.id === user)
			if (userObject.user.bot) return

			subscribeToUser(user, guild.id, characterChannel, openValue || open, characterName)
		})

		await voiceChannel.send(`Character: ${characterName}`)
		await voiceChannel.send(`Open: ${open}`)
		await interaction.reply(`${characterName} has joined the ${voiceChannelName} Voice Channel!`)
	} catch (error) {
		await interaction.reply('Character was unable to join the Voice Channel. Please try again.')
		console.error(`error joining channel: ${error}`)
	}
}