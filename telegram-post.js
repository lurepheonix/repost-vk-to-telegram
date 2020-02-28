const { Database } = require('./databases.js')
const dotenv = require('dotenv').config()
const util = require('util')
const Telegram = require('telegraf/telegram')
const telegram = new Telegram(process.env.tg_token, [ { agent: null, webhookReply: true }]);

class TelegramPost {
    constructor() {}

    async init(vkPost) {
        this.database = new Database()
        await this.database.init();
        if (!await this.database.search(vkPost.id)) {
            /* Adblocker, stage 1 (non-extended, for posts marked as ads)
            Don't format and send such posts, but add them to database anyway */
            let block = false
            if (process.env.adblocker == 0) {
                if (vkPost.marked_as_ads == 1) {
                    block = true
                }
            }
            if (process.env.extended_adblocker == 0) {
                const { adblockerRules } = require('./adblocker_rules.js')
                for (let a in adblockerRules) {
                    if (vkPost.text.search(adblockerRules[a]) != -1) {
                        block = true
                    }
                }
                
            }

            if (block === false) {
                let formattedPost = new Formatter()
                formattedPost = await formattedPost.init(vkPost)
                if (process.env.visual_logs == 0) {
                    console.log("Sending post...")
                }
                if (process.env.debug_logs == 0) {
                    console.log("Formatted post:\n" + util.inspect(formattedPost))
                }
                await this.send(formattedPost)
            } else {
                if (process.env.visual_logs == 0) {
                    console.log("\n[x] New post!")
                    console.log("Ads found in post! Not sending.")
                }
            }
            if (process.env.db_add == 0) {
                    await this.database.addPost(vkPost.id)
            }
        } else {
            if (process.env.visual_logs == 0) {
                console.log("Post found! Skipping.\n")
            }
        }
        this.database.end()
    }

    async send(post) {
        // 1. Send videos above all else
        if (post.types.video === true) {
            for (let v in post.videos) {
                if (process.env.visual_logs == 0) {
                    console.log("Sending videos...")
                }
                await telegram.sendMessage(process.env.tg_group, post.videos[v], { disable_notification: process.env.silent_mode })
            }
        }

        // 2. Send photos 
        if (post.types.photo === true) {
            if (process.env.visual_logs == 0) {
                console.log("Sending photos...")
            }
            await telegram.sendMediaGroup(process.env.tg_group, post.photos, { disable_notification: process.env.silent_mode })
        }

        // 3. Send text
        if (post.types.text === true) {
            if (process.env.visual_logs == 0) {
                console.log("Sending text...")
            }
            await telegram.sendMessage(process.env.tg_group, post.text, { disable_notification: process.env.silent_mode, parse_mode: 'MarkdownV2' })
        }

        // 4. Send long text in parts
        if (post.types.longText === true) {
            if (process.env.visual_logs == 0) {
                console.log("Sending long text, split into several messages...")
            }
            for (let t in post.longText) {
                if (process.env.visual_logs == 0) {
                    console.log("Sending part #" + (t + 1) + "...")
                }
                await telegram.sendMessage(process.env.tg_group, post.longText[t], { disable_notification: process.env.silent_mode, parse_mode: 'MarkdownV2' })
            }
        }

        // 5. Send link
        if (post.types.link === true) {
            if (process.env.visual_logs == 0) {
                console.log("Sending link...")
            }
            await telegram.sendMessage(process.env.tg_group, post.link, { disable_notification: process.env.silent_mode })
        }
    }

}

class Formatter {
    constructor() { }
    
    async init(vkPost) {
        let post = await this.telegramPostSchema(vkPost)
        if (post !== false) {
            post = await this.parseLinks(post)
            post = await this.telegramPostType(post)
        }
        return post
    }

    async telegramPostSchema(vkPost) {
        let post = { types: {text: false,  longText: false, video: false, photo: false, link: false}}
        if (process.env.debug_logs == 0) {
            console.log("Raw VK post:\n" + util.inspect(vkPost))
        }
        if (process.env.visual_logs == 0) {
            console.log("\n[x] New post!")
        }

        if (vkPost.text) {
            post.text = vkPost.text
            post.types.text = true
            if (process.env.visual_logs == 0) {
                console.log(post.text)
            }
        }
        if (vkPost.hasOwnProperty('attachments')) {
            if (process.env.visual_logs == 0) {
                console.log("Attachments:")
            }
            for (let p in vkPost.attachments) {

                if (vkPost.attachments[p].type == 'video') {
                    if (!post.hasOwnProperty('videos')) {
                        post.videos = []
                    }
                    let video = vkPost.attachments[p].video
                    let videoUrl = "https://vk.com/video" + video.owner_id + "_" + video.id
                    post.videos.push(videoUrl)
                    post.types.video = true
                    if (process.env.visual_logs == 0) {
                        console.log("Video URL: " + videoUrl)
                    }
                }

                if (vkPost.attachments[p].type == 'photo') {
                    if (!post.hasOwnProperty('photos')) {
                        post.photos = []
                    }
                    let photo = vkPost.attachments[p].photo
                    let sizeUrl = ""
                    let imageObject = {}
                    let photoSize = 0
                    for (let s in photo.sizes) {
                        let size = photo.sizes[s]
                        if ((size.width * size.height) > photoSize) {
                            photoSize = size.width * size.height;
                            sizeUrl = size.url;
                        }
                    }
                    if (process.env.visual_logs == 0) {
                        console.log("Photo URL: " + sizeUrl)
                    }
                    imageObject.type = 'photo'
                    imageObject.media = sizeUrl
                    post.photos.push(imageObject)
                    post.types.photo = true
                }

                if (vkPost.attachments[p].type == 'link') {
                    post.link = vkPost.attachments[p].link.url
                    post.types.link = true
                }
            }
        }

        // Handle reposts as separate posts 
        if (vkPost.copy_history && process.env.enable_reposts == 0) {
            let newVkPost = new TelegramPost()
            await newVkPost.init(vkPost.copy_history[0])
        }

        /* Now check whether the post is not empty, return false if it is
        (vkPost may contain only properties like audio, polls, etc that are not transferred to the Telegram post) 
        Same goes for posts with ads */
        if (Object.entries(post).length === 0) {
            return false
        } else {
            return post
        }
    }

    // Convert VK untermarkdown links to normal human Markdown
    async parseLinks(post) {
        if (post.types.text === true) {
            let text = post.text
            let regex = /\[\S+\|[^\]]+\]/
            while (regex.exec(text) != null) {
                let search = regex.exec(text)
                //console.log(search)
                let replacement = "[" + /[^|]+\]/.exec(search[0])[0].slice(0, -1) + "](https://vk.com/" + /\[[^|]+/.exec(search[0])[0].slice(1) + ")"
                while (text.indexOf(search[0]) != -1) {
                    text = text.replace(search[0], replacement)
                }
            }
            post.text = text
        }
        return post
    }

    async telegramPostType(post) {
        // 1. Check whether the text exists and whether we can send it as caption if a photo exists (<1024 chars)
        if (post.types.text === true) {
            if (process.env.visual_logs == 0) {
                console.log("Text length: " + post.text.length)
            }
            if (post.text.length < 1024 && post.types.photo === true) {
                if (process.env.visual_logs == 0) {
                    console.log('Add caption to photo')
                }
                post.photos[0].caption = post.text
                post.photos[0].parse_mode = 'MarkdownV2'
                delete post.text
                post.types.text = false
            } else {
        /* 2. If we can't send text as caption, check whether there are any videos/links in the post.
        If there are both, send videos as separate Telegram posts, and attach the link to the text.
        Also, if there is more than one video, send all videos as separate Telegram posts to maintain their original order. */
                if (post.types.video === true && !post.types.link === true) {
                    if (post.videos.length = 1) {
                        post.text = post.text + "\n\n" + post.videos[0]
                        delete post.videos
                        post.types.video = false
                    }
                }
            }
        }
        // 3. If text hasn't been captioned, add a link if text still exists.
        if (post.types.text === true && post.types.link === true) {
            post.text = post.text + "\n\n" + post.link
            delete post.link
            post.types.link = false
        }

        /* 4. If the post still has text, check whether it is long (more than 4095 symbols).
        Telegram doesn't allow sending text messages with more than 4095 symbols, so we have to split such text into several parts. */
        
        let splitLongText = async (text) => {
            if (process.env.visual_logs == 0) {
                console.log("Long text length: " + text.length)
                console.log("Splitting into parts...")
            }

            let longText = []
            while (text.length > 4095) {
                let rawSplit = text.slice(0, 4095)
                let lastSpace = rawSplit.lastIndexOf(" ")
                longText.push(text.slice(0, (lastSpace)))
                text = text.slice((lastSpace + 1))
            }
            if (text.length < 4095) {
                if (process.env.visual_logs == 0) {
                    console.log("Adding last part...")
                }
                longText.push(text);
            }

            return longText
        }

        if (post.types.text === true) {
            if (post.text.length > 4095) {
                post.longText = await splitLongText(post.text)
                delete post.text
                post.types.text = false
                post.types.longText = true
            }
        }

        // 5. Escape all markdown in text, longText and captions
        // Markdown2 requires extensive escaping, but we must not break links
        let md2escape = async (text) => {
            // Escape everything except links (including link text)
            let tgescape = /(\[[^\][]*]\(http[^()]*\))|[-_.+?!#^*~|=$[\](){}\\]/gi
            text = text.replace(tgescape, (x, y) => y ? y : '\\' + x)
            // Escape text in links
            let regex = /\[[^\]]+\]\(/
            let search = regex.exec(text)
            let escapedLinks = null
            
            if (search != null) {
                escapedLinks = text.slice(0, search.index)
                text = text.slice(search.index)
            }
        
            if (regex.exec(text) != null) {
                while (regex.exec(text) != null) {
                    search = regex.exec(text)
                    console.log(util.inspect(search))
                    let escapedLink = search[0].slice(1, search[0].length - 2)
                    escapedLink = "[" + escapedLink.replace(tgescape, (x, y) => y ? y : '\\' + x) + "]"
                    escapedLinks = escapedLinks + text.slice(0, search.index) + escapedLink
                    text = text.slice(search.index + search[0].length - 1)
                }
            }

            if (text.length > 0) {
                if (escapedLinks != null) {
                    escapedLinks = escapedLinks + text
                    console.log(escapedLinks)
                }
            }

            if (escapedLinks == null) {
                return text
            } else {
                return escapedLinks
            }
        }

        if (post.types.text === true) {
            post.text = await md2escape(post.text)
        }

        if (post.types.longText === true) {
            for (let t in post.longText) {
                post.longText[t] = await md2escape(post.longText[t])
            }
        }

        if (post.types.photo === true) {
            if (post.photos[0].caption) {
                post.photos[0].caption = await md2escape(post.photos[0].caption)
                console.log("Caption: " + post.photos[0].caption)
            }
        }

        return post
    }
}

module.exports = { TelegramPost }