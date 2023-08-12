import { Events } from 'discord.js'
import { subscribeToUser } from '../utils'

export const name = Events.VoiceStateUpdate
export const execute = async (oldMember, newMember) => {
	const guild = newMember?.guild
	const newMemberObject = guild.members.cache.find(member => member.user.id === newMember.id)
	const voiceChannel = guild.channels.cache.find(channel => channel.id === newMember.channelId)

	if (newMemberObject.user.bot) {
		if (!oldMember?.channelId && newMember?.channelId) {
			console.log('bot joined')
		} else {
			console.log('bot left')
		}
		return
	}

	if (oldMember?.channelId !== newMember?.channelId) {
		if (!oldMember?.channelId && newMember?.channelId) {
			const characterMessage = voiceChannel.messages.cache.find(message => message.content.includes('Character: '))
			const characterName = characterMessage?.content?.replace('Character: ', '')
			const openMessage = voiceChannel.messages.cache.find(message => message.content.includes('Open: '))
			const openValue = openMessage?.content?.replace('Open: ', '')
			const characterChannel = guild.channels.cache.find(channel => channel.name === `character-${characterName.toLowerCase()}`)

			subscribeToUser(newMember, newMember.guild.id, characterChannel, openValue, characterName)
		} else {
			console.log('user left')
		}
		return
	}
}
