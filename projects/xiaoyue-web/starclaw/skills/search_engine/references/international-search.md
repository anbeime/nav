# 国际搜索引擎指南

## 概述

本指南详细介绍了国际主流搜索引擎的使用方法和技巧，帮助用户高效获取全球信息。

---

## Google

### 基础搜索
```
URL: https://www.google.com/search?q={keyword}
示例: https://www.google.com/search?q=artificial+intelligence
```

### 高级功能

#### 1. 时间过滤
```
# URL参数方式
tbs=qdr:h  # 过去1小时
tbs=qdr:d  # 过去24小时
tbs=qdr:w  # 过去1周
tbs=qdr:m  # 过去1月
tbs=qdr:y  # 过去1年

# 完整URL示例
https://www.google.com/search?q=AI+news&tbs=qdr:d
```

#### 2. 地区限定
```
# 搜索设置中指定国家/地区
# 或使用 cr 参数
cr=countryUS  # 美国
cr=countryCN  # 中国
cr=countryUK  # 英国
```

#### 3. 语言限定
```
lr=lang_zh-CN  # 中文
lr=lang_en     # 英文
lr=lang_ja     # 日文
```

#### 4. 安全搜索
```
safe=active   # 开启
safe=off      # 关闭
```

---

## Bing

### 基础搜索
```
URL: https://www.bing.com/search?q={keyword}
示例: https://www.bing.com/search?q=machine+learning
```

### 高级功能

#### 1. 市场限定
```
mkt=zh-CN  # 中国
mkt=en-US  # 美国
mkt=ja-JP  # 日本
```

#### 2. 语言设置
```
setlang=zh-cn  # 中文
setlang=en-us  # 英文
```

#### 3. 安全搜索
```
adlt=strict  # 严格
adlt=moderate  # 中等
adlt=off  # 关闭
```

---

## DuckDuckGo

### 基础搜索
```
URL: https://duckduckgo.com/html/?q={keyword}
示例: https://duckduckgo.com/html/?q=privacy+tools
```

### Bangs系统

Bangs是DuckDuckGo的特色功能，可以直接跳转到其他网站搜索：

```
格式: !bang keyword

常用Bangs:
!g keyword       # Google搜索
!gh keyword      # GitHub搜索
!so keyword      # Stack Overflow
!w keyword       # Wikipedia
!yt keyword      # YouTube
!r keyword       # Reddit
!mdn keyword     # MDN文档
!npm keyword     # npm包
!py keyword      # Python文档
!aw keyword      # Amazon
!ebay keyword    # eBay
!imdb keyword    # IMDB
!tw keyword      # Twitter
!fb keyword      # Facebook
!linkedin keyword # LinkedIn
```

### 隐私特性
- 不存储IP地址
- 不存储用户代理
- 不存储搜索历史
- 不共享个人信息

---

## Brave Search

### 基础搜索
```
URL: https://search.brave.com/search?q={keyword}
示例: https://search.brave.com/search?q=web+development
```

### 特点
- 独立搜索引擎索引
- 不依赖Google/Bing
- 隐私优先设计
- 无追踪功能

---

## Startpage

### 基础搜索
```
URL: https://www.startpage.com/do/search?q={keyword}
示例: https://www.startpage.com/do/search?q=privacy+search
```

### 特点
- 使用Google搜索结果
- 添加隐私保护层
- 代理用户访问Google
- 不泄露用户信息

---

## Qwant

### 基础搜索
```
URL: https://www.qwant.com/?q={keyword}
示例: https://www.qwant.com/?q=europe+news
```

### 特点
- 欧盟GDPR完全合规
- 法国搜索引擎
- 不追踪用户
- 符合欧洲数据保护标准

---

## Yandex

### 基础搜索
```
URL: https://yandex.com/search/?text={keyword}
示例: https://yandex.com/search/?text=russian+technology
```

### 区域版本
```
yandex.ru   # 俄罗斯
yandex.com  # 国际版
yandex.ua   # 乌克兰
yandex.kz   # 哈萨克斯坦
yandex.by   # 白俄罗斯
```

---

## Naver

### 基础搜索
```
URL: https://search.naver.com/search.naver?query={keyword}
示例: https://search.naver.com/search.naver?query=korean+drama
```

### 特点
- 韩国最大搜索引擎
- 整合多种服务
- 博客、新闻、购物等
- 韩语内容最优

---

## WolframAlpha

### 基础查询
```
URL: https://www.wolframalpha.com/input?i={query}
示例: https://www.wolframalpha.com/input?i=100+USD+to+CNY
```

### 查询类型

#### 数学计算
```
integrate x^2 dx
solve x^2 + 3x + 2 = 0
derivative of sin(x^2)
factor x^4 - 1
```

#### 单位换算
```
100 USD to CNY
5 feet to meters
100 km/h to mph
```

#### 科学数据
```
mass of Earth
speed of light
Bohr radius
Avogadro's number
```

#### 金融数据
```
AAPL stock
BTC price
population of China
GDP of Japan
```

#### 日期时间
```
days between 2024-01-01 and 2024-12-31
weather in Tokyo
sunrise in London
```

---

## 使用建议

### 1. 多引擎交叉验证
对于重要信息，建议使用多个搜索引擎交叉验证结果。

### 2. 隐私保护优先
需要隐私保护时，优先使用DuckDuckGo、Brave或Startpage。

### 3. 地区信息获取
获取特定地区信息时，使用当地主流搜索引擎：
- 中国: 百度
- 俄罗斯: Yandex
- 韩国: Naver
- 欧洲: Qwant

### 4. 技术内容搜索
技术问题优先使用：
- Google (精确搜索)
- DuckDuckGo (!gh, !so)
- WolframAlpha (计算问题)

### 5. 学术研究
学术研究优先使用：
- Google Scholar
- Bing Academic
- WolframAlpha (数据验证)
