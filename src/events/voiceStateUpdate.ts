import { Events } from 'discord.js'
import { getVoiceConnection } from '@discordjs/voice'

export const name = Events.VoiceStateUpdate
export const execute = async (oldMember, newMember) => {
	const guild = newMember?.guild
	
	const connection = getVoiceConnection(guild.id)

	const newMemberObject = guild.members.cache.find(member => member.user.id === newMember?.id || member.user.id === oldMember?.id)
	const voiceChannel = guild.channels.cache.find(channel => channel.id === newMember?.channelId || channel.id === oldMember?.channelId)

	const characterMessage = voiceChannel.messages.cache.find(message => message.content.includes('Character: '))
	const characterName = characterMessage?.content?.replace('Character: ', '')

	const recordMessage = voiceChannel.messages.cache.find(message => message.content.includes('Record:'))

	if (newMemberObject.user.bot) {
		if (oldMember?.channelId && !newMember?.channelId) {
			characterMessage?.delete()
			if (recordMessage) {
				recordMessage.delete()
			}
			connection.destroy()
		}
		return
	}

	if (characterName) {
		if (oldMember?.channelId !== newMember?.channelId) {
			if (oldMember?.channelId && !newMember?.channelId) {				
				const userStream = connection.receiver.subscriptions.get(oldMember.id)
				if (userStream) {
					userStream.destroy()
				}
			}
			return
		}
	}
}
