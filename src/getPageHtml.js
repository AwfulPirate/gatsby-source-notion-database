const puppeteer = require('puppeteer');

process.setMaxListeners(0)
const getPageHtml = async (url) => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForSelector('#notion-app');
    await page.waitFor(8000);
    const data = await page.evaluate(() => {
        // 图片链接转换
        document.querySelectorAll('div.notion-page-content  img').forEach(item => {
            if (item.src.startsWith("https://s3.us-west")) {
                let [parsedOriginUrl] = item.src.split("?")
                item.src = `https://notion.so/image/${encodeURIComponent(parsedOriginUrl).replace("s3.us-west", "s3-us-west")}`
            } else {
                item.src = item.src
            }
        })

        // TOC 链接转化
        let qs = "#notion-app > div > div.notion-cursor-listener > div > div.notion-scroller.vertical.horizontal > div.notion-page-content > div > div:nth-child(1) > div > a"
        document.querySelectorAll(qs).forEach(item => {
            // 真是服了，puppeteer传个函数这么麻烦。🤯
            const getFullBlockId = (blockId) => {
                if (typeof blockId !== 'string') {
                    throw Error(`blockId: ${typeof blockId} must be string`)
                }
                if (blockId.match("^[a-zA-Z0-9]+$")) {
                    return blockId.substr(0, 8) + "-"
                        + blockId.substr(8, 4) + "-"
                        + blockId.substr(12, 4) + "-"
                        + blockId.substr(16, 4) + "-"
                        + blockId.substr(20, 32)
                } else {
                    return blockId
                }
            }
            let hashBlockID = getFullBlockId(item.hash.slice(1))
            item.href = `#${hashBlockID}`

            let block = document.querySelector(`div[data-block-id="${hashBlockID}"]`)
            if (block) {
                block.id = hashBlockID
            }
        });

        // 表格视图 CSS 修复
        document.querySelectorAll("div.notion-scroller.horizontal").forEach(item => {
            item.children[0].style.padding = 0
            item.previousElementSibling.style.paddingLeft = 0
        })
        // 文章内容
        let content = document.querySelector('#notion-app > div > div.notion-cursor-listener > div > div > div.notion-page-content')


        // 可编辑内容修复
        let contenteditable = content.querySelectorAll("div[contenteditable=true]")
        contenteditable.forEach(i => {
            i.setAttribute("contenteditable", false)
        })
        if (content) {
            return content.innerHTML
        }
        else {
            return 'error'
        }
    })

    await browser.close();
    return data
}

module.exports = getPageHtml