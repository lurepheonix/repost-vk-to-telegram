const { VK } = require('vk-io')
const dotenv = require('dotenv').config()
const { TelegramPost } = require('./telegram-post.js')

// If this is first run
const firstrun = async () => {
    console.log("First run! Seeding tables and exiting")
    const { Database } = require('./databases.js')
    let database = new Database()
    await database.init()
    await database.seed()
    await database.end()
}

if (process.argv[2] == 'seed') {
    firstrun()
} else {
    const vk = new VK({
        language: 'ru',
        token: process.env.vk_token
    })

    const vkPosts = async () => {
        let posts = await vk.api.wall.get({
            owner_id: process.env.vk_group_id
        })
        posts = posts.items.reverse()
    
        return posts
    }

    go = async () => {
        let posts = await vkPosts()
        for (post of posts) {
            await new TelegramPost().init(post)
        }
    }
    go()
}