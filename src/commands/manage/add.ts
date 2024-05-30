import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, SlashCommandBuilder } from 'discord.js'
import { joinVoiceChannel } from '@discordjs/voice'
import { subscribeToUser, generateAvatar } from '../../utils'
import path from 'path'
import fs from 'fs'

export const data = new SlashCommandBuilder()
	.setName('add')
	.setDescription('Adds character to voice call.')
	.addStringOption(option =>
		option.setName('name')
			.setDescription('The name of the character to message.')
			.setRequired(true)
			.setAutocomplete(true))
	.addStringOption(option =>
		option.setName('channel')
			.setDescription('The name of the channel the character will join.')
			.setRequired(true)
      .setAutocomplete(true))
	.addBooleanOption(option =>
		option.setName('open')
			.setDescription('Sets if the call is open mic or not.'))

export const execute = async (interaction) => {
	try {
		const characterName = interaction.options.getString('name')
		const voiceChannelId = interaction.options.getString('channel')
		const open = interaction.options?.getBoolean('open')

		const characterChannel = interaction.client.channels.cache.find(channel => channel.name === `character-${characterName.toLowerCase()}`)
		const voiceChannel = interaction.client.channels.cache.get(voiceChannelId)
		const guild = interaction.client.guilds.cache.get(voiceChannel.guildId)
		
		if (process.env.OPENAI_AVATARS === 'TRUE') {
			const bot = interaction.client.users.cache.get(process.env.DISCORD_CLIENT_ID)
			if (fs.existsSync(path.join(__dirname, `../../avatars/${characterName}.png`))) {
				bot.setAvatar(path.join(__dirname, `../../avatars/${characterName}.png`))
			} else {
				const pinnedMessages = await characterChannel.messages.fetchPinned()
				const characterPersonality = pinnedMessages.find(pinnedMessage => pinnedMessage.content.toLowerCase().startsWith('system'))
				await generateAvatar(characterPersonality, characterName)
					.then(() => bot.setAvatar(path.join(__dirname, `../../avatars/${characterName}.png`)))
			}
		}

		const connection = joinVoiceChannel({
			channelId: voiceChannel.id,
			guildId: guild.id,
			adapterCreator: guild.voiceAdapterCreator,
			selfMute: false,
			selfDeaf: false,
		})

		await voiceChannel.send(`Character: ${characterName}`)
		await voiceChannel.send(`Open: ${open || 'false'}`)

		if (open) {
			connection.receiver.speaking.on('start', async (user) => {
				const userObject = guild.members.cache.find(member => member.user.id === user)
				if (userObject.user.bot) return
				subscribeToUser(user, guild.id, characterChannel)
			})
		} else {
			const record = new ButtonBuilder()
				.setCustomId('start')
				.setLabel('Start')
				.setStyle(ButtonStyle.Primary)
			const row = new ActionRowBuilder()
				.addComponents(record)
			await voiceChannel.send({
				content: 'Record:',
				components: [row]
			})
		}
		await interaction.reply(`${characterName} has joined the ${voiceChannel?.name ? `${voiceChannel?.name} ` : ''}Voice Channel!`)
	} catch (error) {
		await interaction.reply('Character was unable to join the Voice Channel. Please try again.')
		console.error(`error joining channel: ${error}`)
	}
}

export const autocomplete = async (interaction) => {
	const focusedOption = interaction.options.getFocused(true)
	const guild = interaction.guild
	if (focusedOption.name === 'name') {
		const characterChannels = guild.channels.cache.filter(channel => channel.name.startsWith('character'))
		const filteredChannels = characterChannels.filter(channel => channel.name.replace('character-', '').toLowerCase().startsWith(focusedOption.value.toLowerCase()))
		interaction.respond(filteredChannels.map(channel => ({
			name: channel.name.replace('character-', ''),
			value: channel.name.replace('character-', '')
		})))
	}
	if (focusedOption.name === 'channel') {
		const voiceChannels = guild.channels.cache.filter(channel => channel.type === ChannelType.GuildVoice)
		const filteredChannels = voiceChannels.filter(channel => channel.name.toLowerCase().startsWith(focusedOption.value.toLowerCase()))
		interaction.respond(filteredChannels.map(channel => ({
			name: channel.name,
			value: channel.id
		})))
	}
}