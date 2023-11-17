import { getVoiceConnection } from '@discordjs/voice'
import { SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
	.setName('remove')
	.setDescription('Removes character bot from voice call.')

export const execute = async (interaction) => {
  try {
		const guild = interaction.guild
    const connection = getVoiceConnection(guild.id)
    connection.disconnect()
    await interaction.reply(`Bot has left the Voice Channel!`)
  } catch (error) {
    await interaction.reply('Unable to remove character from the specified channel.')
		console.error(`error removing from channel: ${error}`)
  }
}
