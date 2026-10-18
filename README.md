# Offer 大作战

复古校园人事部主题的移动优先面试游戏。原生 HTML/CSS/模块 JS + FastAPI，同源服务，无 CDN 和前端构建依赖。原方案、设计稿、CSV、ZIP 与提示词均保留；应用代码在 `app/`、`web/`。

## 现在能体验什么

- 文字面试：v3 五位角色、十个稳定岗位 ID；自选/随机、默认四题（可选2/3/6题）、思考、澄清、跳过、提前结束、结果、PNG。
- 回合视频：角色图的待机/思考/说话动画，真实摄像头本机预览、点击录音、识别后校正、回复字幕及 TTS。静态形象动画不代表精确口型数字人。无权限、无 Key 时保留文字体验。
- 反转：用户当面试官，小欧当应聘者；最多十题，可录取/淘汰，给一次反应。

**2026-10-17：DeepSeek 真实四轮问答和评价已通过；MiniMax 国内站订阅 Key 的图片识别、语音合成和合成语音 ASR 调用成功。桌面独立样音播放器已播放完毕；真人录音、音色人工确认、完整语音整局与手机媒体仍待验收。阿里云可信 HTTPS 已上线，云端真实四轮问答及评分通过，用户确认手机登录成功。** 浏览器假摄像头测试不能替代真机验证。详见 `docs/验收记录.md`。

## 安装启动

需要 Python **3.12**（或安装好 `uv` 由其管理 Python）。媒体识别另需 `ffmpeg`；文字演示不需要它。Node 只用于开发时浏览器测试，启动应用不需要 Node。

```bash
cd /Users/bai/黑客松
bash scripts/start.sh
```

首次启动会创建 `.venv`、安装固定版本依赖、生成缺失的本地头像衍生图，并从 `.env.example` 创建 `.env`。macOS 也可双击 `启动Offer大作战.command`。手动安装：

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/python scripts/prepare_assets.py
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --no-access-log
```

电脑打开 [本机应用](http://localhost:8000)。同一 Wi-Fi 的手机可打开 `http://电脑局域网IP:8000` 体验**文字**。本次检测 IP 为 `10.121.96.77`，换网络后需重新查询 `ipconfig getifaddr en0`。局域网 HTTP 不能算摄像头、录音通过。

终端 Ctrl+C 停止；`PORT=8001 bash scripts/start.sh` 可换端口。只运行**一个 worker/进程**，内存会话不跨进程共享，重启会清空会话。

## 配置真实能力

只编辑项目根目录 `.env`。不要把 Key 贴进聊天、网页、截图或 Git。运行 `.venv/bin/python scripts/check_config.py` 只显示开关与凭证是否齐备，不输出 Key。修改后重启后端；首页“已配置”只表示开关和凭证存在，不表示真实调用通过。

1. DeepSeek：填写 `DEEPSEEK_API_KEY`，设 `DEEPSEEK_ENABLED=true`。默认官方 `https://api.deepseek.com`，模型 `deepseek-flash`；可独立更改模型和 Base URL。
2. MiniMax：`MINIMAX_KEY_TYPE=subscription`。视觉、ASR、TTS 各有独立 `*_ENABLED`、`*_KEY`、`*_URL`、`*_MODEL`；每项按实际权益分别开启。三个 Key 字段可以使用同一 Subscription Key，但不能从其他项目寻找凭证，也不会自动改成按量付费 Key。
3. 示例默认域名为国际站 `api.minimax.io`。本项目用户提供的订阅 Key 在国际站返回401/2049，在国内兼容域名 `api.minimaxi.com` 三项均调用成功，故本地 `.env` 已改为该域名。当前国内文档列 `api.minimax.cn`，本机连接该新域名失败；旧国内域名仍可用。新账户请按控制台和地区文档选择，不能混用。模型为视觉 `MiniMax-M3.1-Flash-Preview`、ASR `asr-1.0`、TTS `speech-2.8-turbo`；成功调用只证明本次小样本，不证明无限额度或并发。
4. TTS 的五个 `VOICE_*` 是系统音色候选，未真实试听。进视频页先点“试听本轮”；认为合适后才勾选后续自动朗读。声音不合适时改 `.env` 中对应音色再重启，不能把候选配置说成已试听定稿。未默认克隆真人声音。

每局可勾选“使用本地演示题库”：该局不会调用 DeepSeek 或 MiniMax。未启用 DeepSeek 时对话自动使用本地题库；若取消“本地演示”勾选，仍可独立测试已配置的 MiniMax 能力。勾选演示才会关闭本局全部外部调用。DeepSeek 单轮失败/格式不合格会标明降级来源，不影响题库闭环；独立媒体失败会提示改为文字/字幕。

官方参考（2026-10-17 已查阅，账号授权仍需实测）：[DeepSeek 调用](https://api-docs.deepseek.com/)、[MiniMax 文档目录](https://platform.minimax.io/docs/llms.txt)、[ASR](https://platform.minimax.io/docs/api-reference/speech-to-text)、[HTTP TTS](https://platform.minimax.io/docs/api-reference/speech-t2a-http)、[视觉](https://platform.minimax.io/docs/api-reference/text-chat-openai)、[套餐与 Key](https://platform.minimax.io/docs/m-plan/faq)、[历史 Token Plan](https://platform.minimax.io/docs/m-plan/token-plan-notice)。HTTP TTS 用完整短文本请求，减少本版 WebSocket 状态复杂度；本版没有承诺实时口型、全双工或固定低延迟。

## 手机 HTTPS 本地测试

无需发布公网网站也可在可信局域网测试，但手机必须**信任证书**。一种方式是在电脑安装 `mkcert` 后：

```bash
mkdir -p certs
mkcert -install
mkcert -key-file certs/offer-key.pem -cert-file certs/offer.pem localhost 127.0.0.1 你的局域网IP
.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8443 --ssl-keyfile certs/offer-key.pem --ssl-certfile certs/offer.pem --no-access-log
```

从 `mkcert -CAROOT` 指向的文件夹只取 `rootCA.pem` 证书，手动在手机安装并按系统设置启用信任。**不要复制或分享 `rootCA-key.pem` 私钥。** 手机和电脑在同一 Wi-Fi，打开 `https://局域网IP:8443`，确认浏览器证书可信后再测试，不跳过证书警告。若不愿安装本地 CA，待授权后可使用已有域名和可信 HTTPS 托管；用户现已批准并部署阿里云测试入口，见下方。

真机需依次检查：镜头预览/关开、录音开始/结束、中文识别校正、实际声音播放、后台切换/挂断后释放、PNG 下载或长按保存。iOS 的播放可能需要再次手动点“试听”；失败时保留字幕。

## 会话、评分和媒体

- 每位访客使用 HttpOnly/SameSite cookie + 随机会话 ID；只信任后端岗位、角色、阶段、历史。默认 TTL 两小时；首页可恢复当前标签页上次会话，记录留在服务端内存，不跨用户共享。没有跨设备历史列表。
- 变更需 `revision` + `request_id`，每局锁串行处理。重复请求返回原结果，冲突提示恢复；评分固定一次。服务端失联时保留输入并提供重试/恢复，不能声称全离线。
- 五维规则在 `app/scoring.py`：不重复有效回答数（最多3）+ 二值行动、应变、协作、创意信号；不奖励字数，不把思考计空答。详情在结果页可展开。真实评价有效时五维为 `floor(0.7*AI+0.3*规则+0.5)`，钳制1–10整数。无 AI 则规则100%并标示演示。
- 后端按最终均值判定：≥6.5录用、≥3.5待定、<3.5淘汰；无有效回答未评定，五维显示1分作为占位。批示与章均由后端状态生成。所谓眼神坚定度只按回答作游戏评价。
- 上传视觉默认关闭，每局只在开场前、明确同意后上传一张；不上传整段视频。图片压缩后仅提取衣着颜色、物品和背景；图像摘要作为不可信数据。视觉失败普通开场。
- 浏览器录音格式在运行时选择 WebM/Opus、MP4 或 Ogg；服务端用 ffmpeg **内存管道**转16kHz单声道 WAV 后提交完整文件，不把流式返回当流式上传。应用上限45秒/6MB，图像上限1MB；不在磁盘保存原始媒体，不把媒体或上游响应体写入日志。第三方的媒体保留规则由其服务条款决定。
- 本版请求超时和队列有限，每次格式错误最多修复一次；不会无限重试。应用层80次POST/分钟/访客、1000局内存上限、每访客30局、每局80次变更，提供商最多4个并发请求。这些是保护上限，**不是已验证承载人数**。

## 测试与部署准备

```bash
uv pip install --python .venv/bin/python -r requirements-dev.txt
.venv/bin/python -m pytest -q
npm ci
npx playwright install chromium
npm test
```

浏览器测试使用 Chromium 的假摄像头/假麦克风、两种引擎的合成音调/模拟 MediaDevices，以及明确拒绝权限路径。录音后校正、转码、播放互斥和旧响应取消均有回归；测试音调不代表真实 TTS。产物在 `docs/artifacts/`，不能代替真人手机和外部 API。测试里对模型的 monkeypatch 仅是适配器模拟。

已准备 `Dockerfile`（含 ffmpeg、非 root）、`.dockerignore` 和 `Caddyfile.example`。部署准备命令：

```bash
docker build -t offer-campus .
docker run --rm --env-file .env -p 127.0.0.1:8000:8000 offer-campus
```

在已有服务器上配置域名、DNS 和 Caddy 反代可取得 HTTPS。反代须保留原 Host；如启用 `COOKIE_SECURE=true`，只用 HTTPS 访问。保持单 worker；不要加多个副本，除非先把会话改成共享存储。Docker 已在用户批准的阿里云实例构建运行，公网 HTTPS、网页登录及真实四轮问答通过；未购买或升级服务。开放多人活动前需要实际并发、额度和滥用防护评估。

阿里云部署准备见 `deploy/README.md`。运行 `.venv/bin/python scripts/package_deployment.py` 可生成不含凭证的 `dist/offer-deployment.tar.gz` 及 SHA256 清单；凭证需另行加密传输，不能打入归档。

项目结构：`app/main.py` 会话/API；`providers.py` 外部适配；`local.py` 题库；`scoring.py` 规则；`web/app.js` 页面；`media.js` 媒体生命周期；`export.js` PNG；`scripts/` 启动与资源；`tests/` 易错行为测试。头像对应凭据在 `web/assets/avatar-mapping.json`，原图解压保留于 `assets/originals/`。

已部署测试入口：[https://47.117.105.33](https://47.117.105.33)。用户名 `hhxy`；临时密码保存在本机 `.env.deploy.access`（权限600，不发送到聊天或写入网址）。服务器目录 `/home/admin/offer-stage/offer`。用户已确认手机登录，功能验收见 `docs/手机验收.md`。公网证据 `docs/artifacts/live/aliyun-https.json` 和 `aliyun-safari-home.png`；页面上“AI已配置”只表示配置存在，真实验收以记录为准。

2026-10-18更新：已加入品牌登录页，账号按用户要求更新。文字和视频面试共用语音输入/朗读，默认静音；解除静音开始收声，再静音上传识别，校正后发送。视频进入通话后先站位，单独同意截图后，回复“站好了”自动看穿搭；也可跳过，不计题。产品文案、错误、结果及PNG不展示提供商品牌。五角色改用对应男声音色，使用同一移动端音频元素解锁并缓存本轮音频。修复键盘视口及视频输入下方空白。记录见 `docs/本轮修改_20261018.md`。

2026-10-18第二轮手机反馈修复：文字面试移除语音输入，保留面试官朗读；视频保留录音。手机房间同时跟随可视视口高度与偏移；收尾语音结束才自动显示录用单，手动领取会停止播放。穿搭确认按钮明确授权单张截图，并显示识别到的衣着或“未看清衣着”。验证及部署结果见 `docs/手机反馈修复_20261018.md`。
