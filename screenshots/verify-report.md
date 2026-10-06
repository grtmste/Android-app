# Content verification: rebuilt site vs scrape/content.json

- Site: http://localhost:8080
- Source: client-supplied (5 pages)
- Run: 2026-10-06T21:47:50.645Z
- **Result: 230/231 items present, 1 missing**


## home ✅

- URL: http://localhost:8080/ (HTTP 200)
- Text blocks: 40/40
- Media files: 20/20
- SVG icons: 0/0
- Video embeds: 0/0

## about-us ✅

- URL: http://localhost:8080/about-us/ (HTTP 200)
- Text blocks: 34/34
- Media files: 1/1
- SVG icons: 0/0
- Video embeds: 0/0

## what-we-do ❌

- URL: http://localhost:8080/what-we-do/ (HTTP 200)
- Text blocks: 88/89
- Media files: 7/7
- SVG icons: 0/0
- Video embeds: 0/0
  - missing paragraph: “Don't have one? We build it with you. Have a messy one? We clean it up. Just want to understand what the hell a tech pack even is? We'll explain like humans.”

## faq ✅

- URL: http://localhost:8080/faq/ (HTTP 200)
- Text blocks: 19/19
- Media files: 0/0
- SVG icons: 0/0
- Video embeds: 0/0

## get-an-offer ✅

- URL: http://localhost:8080/get-an-offer/ (HTTP 200)
- Text blocks: 21/21
- Media files: 0/0
- SVG icons: 0/0
- Video embeds: 0/0
