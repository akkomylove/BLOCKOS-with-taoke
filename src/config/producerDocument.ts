import type { Block } from '@/types/block';
import type { DocumentChapter } from '@/types/page';

export const PRODUCER_DOCUMENT_TITLE = "Block OS 团队制作人文档";
export const PRODUCER_DOCUMENT_ICON = "📓";
export const PRODUCER_DOCUMENT_DESCRIPTION = "展示 Block OS 团队共创过程、架构分工、使用记录与协作设计";
export const PRODUCER_DOCUMENT_CHAPTERS: DocumentChapter[] = [
  {
    "id": "chapter-beginning",
    "title": "01 · 把想法记录下来",
    "blockIds": [
      "blk_vLvUjs14LT7UPN5t",
      "blk_q9aavvabIn8PDj7Y",
      "blk_7t8Ii0cNZvjlY1Sp",
      "blk_Hh3bCUEjvSUUS4FJ"
    ]
  },
  {
    "id": "chapter-people",
    "title": "02 · 几种角色，一起往前走",
    "blockIds": [
      "blk_KYB59p7RvxuPGJEi",
      "blk_WCSyq8flbOrD90Tc",
      "blk_nI99hoSKGUn-pS2s",
      "blk_7cGOKJIaJV6_Tt8P"
    ]
  },
  {
    "id": "chapter-architecture",
    "title": "03 · 给想法一个能落脚的结构",
    "blockIds": [
      "blk_V3yqWQtJ_zwL8jP1",
      "blk_G-5WkAms1zZwbTCl",
      "blk_wEbkmcOCSXuS_lcU",
      "blk_3XEHLfUDwW1YxXBu",
      "blk_trZOeqmYZVwoZyaJ"
    ]
  },
  {
    "id": "chapter-usage",
    "title": "04 · 用起来，问题才有了形状",
    "blockIds": [
      "blk_C4VR_ihKwkBm8B7k",
      "blk_dqtKitsyg8aIzcY0",
      "blk_ElOyWD8p4A9WmG1o",
      "blk_YRf7nkztvM19Zt8-",
      "blk_0_a9_zPjb1Oaw7nY"
    ]
  },
  {
    "id": "chapter-refinement",
    "title": "05 · 把不顺手的地方磨平",
    "blockIds": [
      "blk_uLRZlEIpInsosW3X",
      "blk_VziJMpLL0CxK9HgC",
      "blk_4YhQAP5dVUSmC-97",
      "blk_ICePgrZZTB0Z_88X"
    ]
  },
  {
    "id": "chapter-decisions",
    "title": "06 · 也要知道，什么时候停下来",
    "blockIds": [
      "blk__DMZSEA0g-LZDFOt",
      "blk__zbTu5Bh384ctltJ",
      "blk_532p_NzdK9tQ7rp6"
    ]
  },
  {
    "id": "chapter-future",
    "title": "07 · 有空时，还想试试这些",
    "blockIds": [
      "blk_bREsX8-vAqYQQNYS",
      "blk_lVIlc_dXbE5U0GYS",
      "blk_xS-fWJHneqHDMcR8",
      "blk_sEroji6770AG41MU",
      "blk_SIewA99qrIisc52U"
    ]
  },
  {
    "id": "chapter-references",
    "title": "08 · 想再翻翻的时候",
    "blockIds": [
      "blk_oAo0F7aARbeUfDzw",
      "blk_fX_WHE26Jki9bLjV",
      "blk_-pxSsHBcbBpLRUd5"
    ]
  }
];
export const PRODUCER_DOCUMENT_BLOCKS: Block[] = [
  {
    "id": "blk_vLvUjs14LT7UPN5t",
    "type": "text",
    "title": "01 · 把想法记录下来",
    "content": "01 · 把想法记录下来\n\nBlock OS 已经能用了。现在，轮到我们把一起做它的过程放进来。",
    "meta": {
      "fontSize": 16,
      "richTextContent": "01 · 把想法记录下来\n\nBlock OS 已经能用了。现在，轮到我们把一起做它的过程放进来。",
      "richTextHtml": "<h2 style=\"font-size:24px;font-weight:700;line-height:1.4;margin:0 0 12px;color:#25354c\">01 · 把想法记录下来</h2><p style=\"margin:0 0 14px;line-height:1.8\">Block OS 已经能用了。现在，轮到我们把一起做它的过程放进来。</p>"
    },
    "parentId": null,
    "groupId": null,
    "order": 0,
    "x": 40,
    "y": 40,
    "width": 720,
    "height": 1146,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959730,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_q9aavvabIn8PDj7Y",
    "type": "media",
    "title": "想法，慢慢有了形状",
    "content": "/assets/co-creation/blk_q9aavvabIn8PDj7Y.svg",
    "meta": {
      "caption": "讨论方向，搭出结构，真的用一用，再带着问题回来。"
    },
    "parentId": "blk_vLvUjs14LT7UPN5t",
    "groupId": null,
    "order": 1,
    "x": 60,
    "y": 190,
    "width": 660,
    "height": 440,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_7t8Ii0cNZvjlY1Sp",
    "type": "text",
    "title": "我们自己的工作手记",
    "content": "一个想法被提出，换个角度讨论，再变成代码。有人负责把底子搭稳，有人走进真实使用场景，也有人接着修掉那些不顺手的小地方。\n\n这些往返，也是项目的一部分。把它们放进 Block OS，以后再打开，就能想起我们为什么走到了这里。",
    "meta": {
      "fontSize": 16,
      "richTextContent": "一个想法被提出，换个角度讨论，再变成代码。有人负责把底子搭稳，有人走进真实使用场景，也有人接着修掉那些不顺手的小地方。\n\n这些往返，也是项目的一部分。把它们放进 Block OS，以后再打开，就能想起我们为什么走到了这里。",
      "richTextHtml": "<p style=\"margin:0 0 14px;line-height:1.8\">一个想法被提出，换个角度讨论，再变成代码。有人负责把底子搭稳，有人走进真实使用场景，也有人接着修掉那些不顺手的小地方。</p><p style=\"margin:0 0 14px;line-height:1.8\">这些往返，也是项目的一部分。把它们放进 Block OS，以后再打开，就能想起我们为什么走到了这里。</p>"
    },
    "parentId": "blk_vLvUjs14LT7UPN5t",
    "groupId": null,
    "order": 2,
    "x": 60,
    "y": 190,
    "width": 660,
    "height": 185,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959730,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_Hh3bCUEjvSUUS4FJ",
    "type": "callout",
    "title": "这次要留下的东西",
    "content": "留下想法、交接和取舍。让这份文档成为我们会继续打开的工作笔记。",
    "meta": {
      "calloutTheme": "purple",
      "calloutIcon": "💡"
    },
    "parentId": "blk_vLvUjs14LT7UPN5t",
    "groupId": null,
    "order": 3,
    "x": 60,
    "y": 190,
    "width": 660,
    "height": 145,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_KYB59p7RvxuPGJEi",
    "type": "text",
    "title": "02 · 几种角色，一起往前走",
    "content": "02 · 几种角色，一起往前走\n\n各自擅长的事情不同，接力的地方也就有了意义。",
    "meta": {
      "fontSize": 16,
      "richTextContent": "02 · 几种角色，一起往前走\n\n各自擅长的事情不同，接力的地方也就有了意义。",
      "richTextHtml": "<h2 style=\"font-size:24px;font-weight:700;line-height:1.4;margin:0 0 12px;color:#25354c\">02 · 几种角色，一起往前走</h2><p style=\"margin:0 0 14px;line-height:1.8\">各自擅长的事情不同，接力的地方也就有了意义。</p>"
    },
    "parentId": null,
    "groupId": null,
    "order": 4,
    "x": 820,
    "y": 40,
    "width": 720,
    "height": 1476,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959764,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_WCSyq8flbOrD90Tc",
    "type": "mermaid",
    "title": "想法与反馈怎样流动",
    "content": "flowchart LR\n  I[\"DeepSeek / GLM<br/>Idea 方向\"] --> A[\"ChatGPT<br/>底层架构\"]\n  A --> U[\"千问 3.8 Flash<br/>真实使用模拟\"]\n  U --> F[\"Gemini 3.8 Flash<br/>小修与调整\"]\n  F -. \"新问题与反馈\" .-> A\n  K[\"Akko · 协调与取舍\"] --- I\n  K --- U\n  style I fill:#fff4cc,stroke:#d9c17a\n  style A fill:#e7efff,stroke:#8ca9dd\n  style U fill:#eee8fa,stroke:#b2a1d2\n  style F fill:#e4f2e9,stroke:#91baa1\n  style K fill:#fff,stroke:#c6cbd3",
    "meta": {
      "links": [
        "blk_7cGOKJIaJV6_Tt8P"
      ]
    },
    "parentId": "blk_KYB59p7RvxuPGJEi",
    "groupId": null,
    "order": 5,
    "x": 840,
    "y": 190,
    "width": 660,
    "height": 290,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959764,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_nI99hoSKGUn-pS2s",
    "type": "table",
    "title": "各自承担的那一段",
    "content": "{\"columns\":[\"参与者\",\"主要负责\"],\"rows\":[[\"DeepSeek、GLM\",\"Idea 方向\"],[\"千问 3.8 Flash\",\"搭建后模拟客户的真实使用\"],[\"ChatGPT\",\"底层代码架构\"],[\"Gemini 3.8 Flash\",\"小 Bug 修复、小功能调整\"],[\"Akko\",\"提出需求、传递反馈、确定取舍\"]]}",
    "meta": {},
    "parentId": "blk_KYB59p7RvxuPGJEi",
    "groupId": null,
    "order": 6,
    "x": 840,
    "y": 190,
    "width": 660,
    "height": 350,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959764,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_7cGOKJIaJV6_Tt8P",
    "type": "whiteboard",
    "title": "随手板书：协作接力草图",
    "content": "/assets/co-creation/blk_7cGOKJIaJV6_Tt8P.svg",
    "meta": {
      "caption": "协作关系草图，可以继续在画板上添画。"
    },
    "parentId": "blk_KYB59p7RvxuPGJEi",
    "groupId": null,
    "order": 7,
    "x": 840,
    "y": 190,
    "width": 660,
    "height": 460,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_V3yqWQtJ_zwL8jP1",
    "type": "text",
    "title": "03 · 给想法一个能落脚的结构",
    "content": "03 · 给想法一个能落脚的结构\n\n底层架构要让编辑、保存、AI 和后续调整接得起来。",
    "meta": {
      "fontSize": 16,
      "richTextContent": "03 · 给想法一个能落脚的结构\n\n底层架构要让编辑、保存、AI 和后续调整接得起来。",
      "richTextHtml": "<h2 style=\"font-size:24px;font-weight:700;line-height:1.4;margin:0 0 12px;color:#25354c\">03 · 给想法一个能落脚的结构</h2><p style=\"margin:0 0 14px;line-height:1.8\">底层架构要让编辑、保存、AI 和后续调整接得起来。</p>"
    },
    "parentId": null,
    "groupId": null,
    "order": 8,
    "x": 40,
    "y": 1226,
    "width": 720,
    "height": 1773,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959792,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_G-5WkAms1zZwbTCl",
    "type": "mermaid",
    "title": "从画布，到真正留下内容",
    "content": "flowchart TB\n  C[\"Block 画布 / 章节阅读\"] --> S[\"状态管理 · Zustand + Immer\"]\n  S --> R[\"API · 身份与权限\"]\n  R --> D[\"持久化 · SQLite / 云端存储\"]\n  E[\"外部协作者\"] --> M[\"MCP\"]\n  M --> R\n  R <--> A[\"AI 服务\"]\n  style C fill:#e7efff,stroke:#8ca9dd\n  style S fill:#f0ecfa,stroke:#b6a8d5\n  style D fill:#e4f2e9,stroke:#91baa1\n  style E fill:#fff4cc,stroke:#d9c17a",
    "meta": {
      "links": [
        "blk_0_a9_zPjb1Oaw7nY"
      ]
    },
    "parentId": "blk_V3yqWQtJ_zwL8jP1",
    "groupId": null,
    "order": 9,
    "x": 60,
    "y": 1376,
    "width": 660,
    "height": 330,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_wEbkmcOCSXuS_lcU",
    "type": "text",
    "title": "内容可以重新组合",
    "content": "文字、代码、图片、表格各有自己的 Block。父子关系把内容组织起来，关联把分散的想法重新连上；画布负责自由摆放，章节负责顺着读下去。\n\n有了这一层结构，新的小功能和使用反馈就能落到具体位置，后面的调整也更容易延续已有工作。",
    "meta": {
      "fontSize": 16,
      "richTextContent": "文字、代码、图片、表格各有自己的 Block。父子关系把内容组织起来，关联把分散的想法重新连上；画布负责自由摆放，章节负责顺着读下去。\n\n有了这一层结构，新的小功能和使用反馈就能落到具体位置，后面的调整也更容易延续已有工作。",
      "richTextHtml": "<p style=\"margin:0 0 14px;line-height:1.8\">文字、代码、图片、表格各有自己的 Block。父子关系把内容组织起来，关联把分散的想法重新连上；画布负责自由摆放，章节负责顺着读下去。</p><p style=\"margin:0 0 14px;line-height:1.8\">有了这一层结构，新的小功能和使用反馈就能落到具体位置，后面的调整也更容易延续已有工作。</p>"
    },
    "parentId": "blk_V3yqWQtJ_zwL8jP1",
    "groupId": null,
    "order": 10,
    "x": 60,
    "y": 1376,
    "width": 660,
    "height": 190,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959792,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_3XEHLfUDwW1YxXBu",
    "type": "media",
    "title": "工作台留下的一个画面",
    "content": "/assets/co-creation/blk_3XEHLfUDwW1YxXBu.png",
    "meta": {
      "caption": "项目早期工作台截图：把不同内容放到同一张画布上。"
    },
    "parentId": "blk_V3yqWQtJ_zwL8jP1",
    "groupId": null,
    "order": 11,
    "x": 60,
    "y": 1376,
    "width": 660,
    "height": 435,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_trZOeqmYZVwoZyaJ",
    "type": "mindmap",
    "title": "我们围绕什么展开工作",
    "content": "{\"id\":\"map-root\",\"text\":\"Block OS\",\"children\":[{\"id\":\"map-ideas\",\"text\":\"想法\",\"children\":[{\"id\":\"map-block\",\"text\":\"内容自由组合\",\"children\":[]},{\"id\":\"map-record\",\"text\":\"把工作留下来\",\"children\":[]}]},{\"id\":\"map-arch\",\"text\":\"架构\",\"children\":[{\"id\":\"map-state\",\"text\":\"状态与保存\",\"children\":[],\"linkedBlockId\":\"blk_G-5WkAms1zZwbTCl\"},{\"id\":\"map-mcp\",\"text\":\"AI 与 MCP\",\"children\":[]}]},{\"id\":\"map-use\",\"text\":\"使用\",\"children\":[{\"id\":\"map-journey\",\"text\":\"完整操作路径\",\"children\":[],\"linkedBlockId\":\"blk_dqtKitsyg8aIzcY0\"},{\"id\":\"map-bugs\",\"text\":\"反馈与修复\",\"children\":[]}]},{\"id\":\"map-next\",\"text\":\"以后\",\"children\":[],\"linkedBlockId\":\"blk_xS-fWJHneqHDMcR8\"}]}",
    "meta": {
      "links": [
        "blk_lVIlc_dXbE5U0GYS"
      ]
    },
    "parentId": "blk_V3yqWQtJ_zwL8jP1",
    "groupId": null,
    "order": 12,
    "x": 60,
    "y": 1376,
    "width": 660,
    "height": 430,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_C4VR_ihKwkBm8B7k",
    "type": "text",
    "title": "04 · 用起来，问题才有了形状",
    "content": "04 · 用起来，问题才有了形状\n\n模拟客户使用时，关注点从“这个功能有没有”变成了“这件事能不能顺利做完”。",
    "meta": {
      "fontSize": 16,
      "richTextContent": "04 · 用起来，问题才有了形状\n\n模拟客户使用时，关注点从“这个功能有没有”变成了“这件事能不能顺利做完”。",
      "richTextHtml": "<h2 style=\"font-size:24px;font-weight:700;line-height:1.4;margin:0 0 12px;color:#25354c\">04 · 用起来，问题才有了形状</h2><p style=\"margin:0 0 14px;line-height:1.8\">模拟客户使用时，关注点从“这个功能有没有”变成了“这件事能不能顺利做完”。</p>"
    },
    "parentId": null,
    "groupId": null,
    "order": 13,
    "x": 820,
    "y": 1556,
    "width": 720,
    "height": 1183,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959823,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_dqtKitsyg8aIzcY0",
    "type": "table",
    "title": "几次具体的来回",
    "content": "{\"columns\":[\"遇到的事\",\"后来怎样处理\"],\"rows\":[[\"编辑当时正常，切页或刷新后内容、格式不稳\",\"按文档安排保存，等待页面创建完成，再验证刷新后的结果\"],[\"代码只输出第一行，定时器还没运行就结束\",\"跟踪异步任务，分批回传日志，完成后再报告成功\"],[\"导入后出现丢批次或重复内容\",\"等待保存完成，以修订号防覆盖，以批次回执避免重复导入\"],[\"服务端 PDF 导出不可用\",\"增加客户端生成并下载 PDF 的兜底路径\"]]}",
    "meta": {},
    "parentId": "blk_C4VR_ihKwkBm8B7k",
    "groupId": null,
    "order": 14,
    "x": 840,
    "y": 1706,
    "width": 660,
    "height": 310,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_ElOyWD8p4A9WmG1o",
    "type": "code",
    "title": "只有两行，却暴露了执行时机的问题",
    "content": "console.log('SYNC-OK');\nsetTimeout(() => console.log('ASYNC-OK'), 600);",
    "meta": {
      "language": "javascript",
      "links": [
        "blk_YRf7nkztvM19Zt8-"
      ]
    },
    "parentId": "blk_C4VR_ihKwkBm8B7k",
    "groupId": null,
    "order": 15,
    "x": 840,
    "y": 1706,
    "width": 660,
    "height": 185,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959823,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_YRf7nkztvM19Zt8-",
    "type": "callout",
    "title": "什么时候才算完成",
    "content": "同步代码结束，异步任务还可能在路上。成功提示应该等到该完成的工作真正完成。",
    "meta": {
      "calloutTheme": "info",
      "calloutIcon": "📌"
    },
    "parentId": "blk_C4VR_ihKwkBm8B7k",
    "groupId": null,
    "order": 16,
    "x": 840,
    "y": 1706,
    "width": 660,
    "height": 145,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_0_a9_zPjb1Oaw7nY",
    "type": "text",
    "title": "保存之后，还能再找到它",
    "content": "编辑、切页、刷新，再回来继续写，才是一条完整的使用路径。接口返回成功、内容真的存下、重试没有多生成一份，这些细节决定了一个工具能不能让人放心。",
    "meta": {
      "fontSize": 16,
      "richTextContent": "编辑、切页、刷新，再回来继续写，才是一条完整的使用路径。接口返回成功、内容真的存下、重试没有多生成一份，这些细节决定了一个工具能不能让人放心。",
      "richTextHtml": "<p style=\"margin:0 0 14px;line-height:1.8\">编辑、切页、刷新，再回来继续写，才是一条完整的使用路径。接口返回成功、内容真的存下、重试没有多生成一份，这些细节决定了一个工具能不能让人放心。</p>"
    },
    "parentId": "blk_C4VR_ihKwkBm8B7k",
    "groupId": null,
    "order": 17,
    "x": 840,
    "y": 1706,
    "width": 660,
    "height": 155,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_uLRZlEIpInsosW3X",
    "type": "text",
    "title": "05 · 把不顺手的地方磨平",
    "content": "05 · 把不顺手的地方磨平\n\n很多变化很小：一个入口，一次反馈，一个关闭弹窗的动作。它们一起组成了日常使用的感受。",
    "meta": {
      "fontSize": 16,
      "richTextContent": "05 · 把不顺手的地方磨平\n\n很多变化很小：一个入口，一次反馈，一个关闭弹窗的动作。它们一起组成了日常使用的感受。",
      "richTextHtml": "<h2 style=\"font-size:24px;font-weight:700;line-height:1.4;margin:0 0 12px;color:#25354c\">05 · 把不顺手的地方磨平</h2><p style=\"margin:0 0 14px;line-height:1.8\">很多变化很小：一个入口，一次反馈，一个关闭弹窗的动作。它们一起组成了日常使用的感受。</p>"
    },
    "parentId": null,
    "groupId": null,
    "order": 18,
    "x": 53,
    "y": 3249,
    "width": 720,
    "height": 931,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959853,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_VziJMpLL0CxK9HgC",
    "type": "text",
    "title": "在已有结构上，继续往前一点",
    "content": "底层稳定以后，Gemini 3.8 Flash 主要承接小 Bug 和小功能调整。修补具体问题，也让界面的反馈更完整。\n\n打开的面板要真的出现；弹窗要能顺利关闭；历史恢复之前要能看清将要发生什么。一次小修，也值得重新走一遍操作。",
    "meta": {
      "fontSize": 16,
      "richTextContent": "底层稳定以后，Gemini 3.8 Flash 主要承接小 Bug 和小功能调整。修补具体问题，也让界面的反馈更完整。\n\n打开的面板要真的出现；弹窗要能顺利关闭；历史恢复之前要能看清将要发生什么。一次小修，也值得重新走一遍操作。",
      "richTextHtml": "<p style=\"margin:0 0 14px;line-height:1.8\">底层稳定以后，Gemini 3.8 Flash 主要承接小 Bug 和小功能调整。修补具体问题，也让界面的反馈更完整。</p><p style=\"margin:0 0 14px;line-height:1.8\">打开的面板要真的出现；弹窗要能顺利关闭；历史恢复之前要能看清将要发生什么。一次小修，也值得重新走一遍操作。</p>",
      "links": [
        "blk_4YhQAP5dVUSmC-97"
      ]
    },
    "parentId": "blk_uLRZlEIpInsosW3X",
    "groupId": null,
    "order": 19,
    "x": 60,
    "y": 3189,
    "width": 660,
    "height": 195,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959853,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_4YhQAP5dVUSmC-97",
    "type": "mermaid",
    "title": "修好以后，再走一遍",
    "content": "flowchart LR\n  U[\"使用\"] --> Q[\"发现问题\"] --> F[\"调整\"] --> V[\"重新使用\"]\n  V -. \"还有不顺手的地方\" .-> Q\n  style U fill:#e7efff,stroke:#8ca9dd\n  style Q fill:#fff4cc,stroke:#d9c17a\n  style F fill:#eee8fa,stroke:#b2a1d2\n  style V fill:#e4f2e9,stroke:#91baa1",
    "meta": {},
    "parentId": "blk_uLRZlEIpInsosW3X",
    "groupId": null,
    "order": 20,
    "x": 60,
    "y": 3189,
    "width": 660,
    "height": 215,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_ICePgrZZTB0Z_88X",
    "type": "callout",
    "title": "决定也可以继续更新",
    "content": "PDF 兜底从浏览器打印，走到直接生成下载。新的使用反馈，会让原来的选择继续变好。",
    "meta": {
      "calloutTheme": "success",
      "calloutIcon": "✅"
    },
    "parentId": "blk_uLRZlEIpInsosW3X",
    "groupId": null,
    "order": 21,
    "x": 60,
    "y": 3189,
    "width": 660,
    "height": 145,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959853,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk__DMZSEA0g-LZDFOt",
    "type": "text",
    "title": "06 · 也要知道，什么时候停下来",
    "content": "06 · 也要知道，什么时候停下来\n\n当前方案已经基本定稿。这一版，先好好用起来。",
    "meta": {
      "fontSize": 16,
      "richTextContent": "06 · 也要知道，什么时候停下来\n\n当前方案已经基本定稿。这一版，先好好用起来。",
      "richTextHtml": "<h2 style=\"font-size:24px;font-weight:700;line-height:1.4;margin:0 0 12px;color:#25354c\">06 · 也要知道，什么时候停下来</h2><p style=\"margin:0 0 14px;line-height:1.8\">当前方案已经基本定稿。这一版，先好好用起来。</p>"
    },
    "parentId": null,
    "groupId": null,
    "order": 22,
    "x": 820,
    "y": 2779,
    "width": 720,
    "height": 714,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959885,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk__zbTu5Bh384ctltJ",
    "type": "callout",
    "title": "保留当前主要使用版本",
    "content": "当前版本作为主要使用版本。后续围绕明确的问题做小幅修正，新的想法先记下来。",
    "meta": {
      "calloutTheme": "purple",
      "calloutIcon": "🎯",
      "links": [
        "blk_xS-fWJHneqHDMcR8"
      ]
    },
    "parentId": "blk__DMZSEA0g-LZDFOt",
    "groupId": null,
    "order": 23,
    "x": 840,
    "y": 2929,
    "width": 660,
    "height": 145,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959885,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_532p_NzdK9tQ7rp6",
    "type": "text",
    "title": "这段合作，值得留下来的部分",
    "content": "方向、架构、使用与修复之间，始终在互相影响。一次真实操作会带来新的问题，一次底层修正又会改变下一轮的体验。\n\n这些来回让项目慢慢有了现在的样子。以后再打开这份笔记，我们还可以继续补上当时没讲完的想法，也可以看看，哪些选择后来真的经住了使用。",
    "meta": {
      "fontSize": 16,
      "richTextContent": "方向、架构、使用与修复之间，始终在互相影响。一次真实操作会带来新的问题，一次底层修正又会改变下一轮的体验。\n\n这些来回让项目慢慢有了现在的样子。以后再打开这份笔记，我们还可以继续补上当时没讲完的想法，也可以看看，哪些选择后来真的经住了使用。",
      "richTextHtml": "<p style=\"margin:0 0 14px;line-height:1.8\">方向、架构、使用与修复之间，始终在互相影响。一次真实操作会带来新的问题，一次底层修正又会改变下一轮的体验。</p><p style=\"margin:0 0 14px;line-height:1.8\">这些来回让项目慢慢有了现在的样子。以后再打开这份笔记，我们还可以继续补上当时没讲完的想法，也可以看看，哪些选择后来真的经住了使用。</p>"
    },
    "parentId": "blk__DMZSEA0g-LZDFOt",
    "groupId": null,
    "order": 24,
    "x": 840,
    "y": 2929,
    "width": 660,
    "height": 205,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959885,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_bREsX8-vAqYQQNYS",
    "type": "text",
    "title": "07 · 有空时，还想试试这些",
    "content": "07 · 有空时，还想试试这些\n\n先放进待办，想到时再继续。这里没有排期，也不急着进入当前版本。",
    "meta": {
      "fontSize": 16,
      "richTextContent": "07 · 有空时，还想试试这些\n\n先放进待办，想到时再继续。这里没有排期，也不急着进入当前版本。",
      "richTextHtml": "<h2 style=\"font-size:24px;font-weight:700;line-height:1.4;margin:0 0 12px;color:#25354c\">07 · 有空时，还想试试这些</h2><p style=\"margin:0 0 14px;line-height:1.8\">先放进待办，想到时再继续。这里没有排期，也不急着进入当前版本。</p>"
    },
    "parentId": null,
    "groupId": null,
    "order": 25,
    "x": 53,
    "y": 4233,
    "width": 720,
    "height": 848,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_lVIlc_dXbE5U0GYS",
    "type": "todo",
    "title": "工作记录模板",
    "content": "把这次好用的卡片组合，沉淀成一份日常工作记录模板。",
    "meta": {
      "checked": false
    },
    "parentId": "blk_bREsX8-vAqYQQNYS",
    "groupId": null,
    "order": 26,
    "x": 60,
    "y": 4160,
    "width": 660,
    "height": 115,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_xS-fWJHneqHDMcR8",
    "type": "todo",
    "title": "长期共写",
    "content": "尝试让 MCP 支持更新已有卡片，方便持续共写同一份文档。",
    "meta": {
      "checked": false
    },
    "parentId": "blk_bREsX8-vAqYQQNYS",
    "groupId": null,
    "order": 27,
    "x": 60,
    "y": 4160,
    "width": 660,
    "height": 115,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_sEroji6770AG41MU",
    "type": "todo",
    "title": "随时读，随手记",
    "content": "用手机完整读一遍这份笔记，记录哪些内容适合随手补写。",
    "meta": {
      "checked": false
    },
    "parentId": "blk_bREsX8-vAqYQQNYS",
    "groupId": null,
    "order": 28,
    "x": 60,
    "y": 4160,
    "width": 660,
    "height": 115,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_SIewA99qrIisc52U",
    "type": "todo",
    "title": "再观察一次真实使用",
    "content": "找一次真实的记录需求，从新建、编辑到导出，再走一遍。",
    "meta": {
      "checked": false
    },
    "parentId": "blk_bREsX8-vAqYQQNYS",
    "groupId": null,
    "order": 29,
    "x": 60,
    "y": 4160,
    "width": 660,
    "height": 115,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_oAo0F7aARbeUfDzw",
    "type": "text",
    "title": "08 · 想再翻翻的时候",
    "content": "08 · 想再翻翻的时候\n\n代码、设计与修复过程，都还在项目里。",
    "meta": {
      "fontSize": 16,
      "richTextContent": "08 · 想再翻翻的时候\n\n代码、设计与修复过程，都还在项目里。",
      "richTextHtml": "<h2 style=\"font-size:24px;font-weight:700;line-height:1.4;margin:0 0 12px;color:#25354c\">08 · 想再翻翻的时候</h2><p style=\"margin:0 0 14px;line-height:1.8\">代码、设计与修复过程，都还在项目里。</p>"
    },
    "parentId": null,
    "groupId": null,
    "order": 30,
    "x": 820,
    "y": 3533,
    "width": 720,
    "height": 664,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792407959915,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_fX_WHE26Jki9bLjV",
    "type": "bookmark",
    "title": "Block OS · 项目仓库",
    "content": "https://github.com/akkomylove/BLOCKOS-with-taoke",
    "meta": {
      "bookmarkUrl": "https://github.com/akkomylove/BLOCKOS-with-taoke",
      "bookmarkTitle": "Block OS · 项目仓库",
      "bookmarkDesc": "回到实现里，看看某个想法最后落在了哪里。"
    },
    "parentId": "blk_oAo0F7aARbeUfDzw",
    "groupId": null,
    "order": 31,
    "x": 840,
    "y": 3683,
    "width": 660,
    "height": 150,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  },
  {
    "id": "blk_-pxSsHBcbBpLRUd5",
    "type": "bookmark",
    "title": "设计与修复记录",
    "content": "https://github.com/akkomylove/BLOCKOS-with-taoke/tree/main/docs",
    "meta": {
      "bookmarkUrl": "https://github.com/akkomylove/BLOCKOS-with-taoke/tree/main/docs",
      "bookmarkTitle": "设计与修复记录",
      "bookmarkDesc": "使用手册、协作设计，以及 R2、R3、D-29、D-30～D-32 的修复记录。"
    },
    "parentId": "blk_oAo0F7aARbeUfDzw",
    "groupId": null,
    "order": 32,
    "x": 840,
    "y": 3683,
    "width": 660,
    "height": 150,
    "collapsed": false,
    "version": 4,
    "createdAt": 1792408988338,
    "updatedAt": 1792409882269
  }
];
