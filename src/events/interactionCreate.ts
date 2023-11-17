import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from 'discord.js'
import { subscribeToUser } from '../utils'

export const name = Events.InteractionCreate
export const execute = async (interaction) => {
	if (interaction?.isChatInputCommand() || interaction?.isAutocomplete()) {
		const command = interaction.client.commands.get(interaction.commandName)

		if (!command) {
			console.error(`No command matching ${interaction.commandName} was found.`)
			return
		}

		try {
			if (interaction?.isChatInputCommand()) {
				await command.execute(interaction)
			} else if (interaction?.isAutocomplete()) {
				await command.autocomplete(interaction)
			}
		} catch (error) {
			console.error(`Error executing ${interaction.commandName}`)
			console.error(error)
		}
	} else if (interaction.isButton()) {
		try {
			if (interaction.customId === 'start') {
				const guild = interaction.client.guilds.cache.get(interaction.guildId)
				const user = interaction.user
				const voiceChannel = guild.channels.cache.find(channel => channel.id === interaction.channelId)
				const characterMessage = voiceChannel.messages.cache.find(message => message.content.includes('Character: '))
				const characterName = characterMessage?.content?.replace('Character: ', '')
			
				const characterChannel = guild.channels.cache.find(channel => channel.name === `character-${characterName.toLowerCase()}`)
				subscribeToUser(user.id, interaction.guildId, characterChannel, voiceChannel)

				const record = new ButtonBuilder()
					.setCustomId('start')
					.setLabel('Recording')
					.setStyle(ButtonStyle.Primary)
					.setDisabled(true)
				const row = new ActionRowBuilder()
					.addComponents(record)
				await interaction.update({
					content: 'Record:',
					components: [row]
				})
			}
		} catch (error) {
			console.error(`Error clicking button ${interaction.customId}`)
			console.error(error)
		}
	} else return
}
