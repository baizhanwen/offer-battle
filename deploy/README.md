# 阿里云部署准备

目标：用户提供的轻量应用服务器 `47.117.105.33`（私网 `172.24.23.186`），上海，Ubuntu 22.04.5，2核2GB，40GB。2026-10-17 恢复登录后确认运行中，磁盘约3.93GB、内存约0.45GB已用。现有防火墙已开放TCP80/443/22及ICMP；实例没有关联域名。Workbench只读检查未见80/443监听，未找到Docker/Caddy/Nginx/ffmpeg可执行文件。**用户已批准本方案，Docker29.1.3与Compose2.40.3已安装；源码和凭证已加密上传并核验。容器已构建启动，可信HTTPS、口令保护、云端真实四轮问答与评分通过；Safari已打开主页，用户确认手机登录成功，手机功能待反馈。**

## 本次已批准方案

- 入口：`https://47.117.105.33`，用于用户手机验收；临时访问口令保护，减少陌生人消耗模型额度。口令不写进源码或本文件，已生成并存本地权限600的 `.env.deploy.access`；服务器只收到bcrypt摘要。
- Compose：`deploy/compose.yaml`，应用单worker、非root，不映射公网8000；仅在这个不公开应用端口的私有容器网络内信任反代头，保持HTTPS同源校验与Secure Cookie；Caddy 2.11.7只映射现有80/443并反代应用。Caddy配置 `deploy/Caddyfile.aliyun`，后台自动续期，证书数据卷持久保存。
- HTTPS：显式使用Let's Encrypt的`shortlived`公网IP证书和HTTP-01验证，设置公网IP为无SNI连接的默认名，适配阿里云公网/私网NAT。它是可信证书方案，不能用自签或忽略证书警告替代验收。证书已实际签发，公网使用系统CA校验通过，SAN为47.117.105.33；签发期限2026-10-17 18:07:01至2026-10-24 10:07:00（北京时间）。自动续期已配置但尚未经时间验证。
- 上传内容：无凭证源码包，以及另行加密传输到该实例的本项目`.env`和临时访问配置。凭证只供服务器后端使用，权限600，不进入公开目录、浏览器命令历史或镜像。
- 需要安装服务器尚未具备的Docker及Compose，使用系统已配置的Ubuntu官方镜像源；apt-cache已确认Docker29.1.3与Compose2.40.3候选版本（已安装）。不重置系统、不升级规格、不购买域名/服务。

当前Let's Encrypt支持免费公网IP证书，160小时有效期且需自动续期，参见[官方公告](https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability)。Caddy的`profile`和`disable_tlsalpn_challenge`见[官方TLS配置](https://caddyserver.com/docs/caddyfile/directives/tls)，`default_sni`见[全局选项](https://caddyserver.com/docs/caddyfile/options)。版本来源：[Caddy v2.11.7](https://github.com/caddyserver/caddy/releases/tag/v2.11.7)。这些资料证明方案支持，不能替代实际签发和手机验证。

## 发布前检查

通过已登录控制台的远程连接/命令助手，只读检查：

```sh
uname -a
df -h /
free -h
ss -lntp
command -v docker
command -v caddy
```

核对防火墙现有规则、域名/DNS、已有网站，避免覆盖。无需重置密码或升级实例。确认可信 HTTPS 的入口后再确定 Caddy 配置。手机媒体测试不能使用普通 HTTP 或绕过证书警告。

## 发布包

本机执行 `.venv/bin/python scripts/package_deployment.py`，生成 `dist/offer-deployment.tar.gz` 和 SHA256 清单。白名单仅包含应用、网页、提示词、依赖及部署模板。**不含 `.env`、密钥、原始个人资料、测试录音、验收产物或本机依赖。**

部署操作须在明确发布方案并得到授权后执行。用户已明确同意安装、加密上传凭证到本实例、签发免费IP证书及开放临时口令保护入口。以下为复现命令，当前状态以验收记录为准。

安装Docker及Compose后，在解包目录准备 `.env` 与 `.env.deploy`（参考 `deploy/access.env.example`）。正式启动命令：

```sh
docker compose -f deploy/compose.yaml config --quiet
docker compose -f deploy/compose.yaml up -d --build
```

在服务器单独保存权限600的 `.env`，使用用户现有订阅 Key，配置成功后设 `COOKIE_SECURE=true`。如传输本机 `.env`，须确认该具体服务器是授权保存凭证的目标，并使用加密传输；不得在浏览器命令/日志中粘贴密钥。

Compose中的应用8000仅在容器网络可达，外部由可信HTTPS反代访问。保持单worker。若之后改用现有域名，先确认归属、DNS及已有站点；不要购买域名或覆盖已有反代配置。公开本次入口前，给用户展示具体配置并确认；现有防火墙不需要新增8000规则。

## 验收与回退

先检查Compose健康状态，再带临时口令检查实际HTTPS证书、主页、文字整局及手机摄像头/录音/播放/PNG。health为true只证明配置存在。服务器重启或容器替换会清空内存会话；已有会话不应承诺保留。

失败时停止本次应用容器并恢复本次修改前的反代配置；不要删除旧网站、已有镜像、用户数据或防火墙规则。未发布前没有线上回退动作。

本地准备验证：Docker Compose 5.1.2对配置的静态校验通过；官方Caddy2.11.7 macOS ARM64发行包按官方SHA512清单核验后，adapt与validate均通过，使用的仅为虚拟访问口令。证据 `docs/artifacts/deployment-validation.json`。这不证明服务器构建、拉取镜像、签发证书、自动续期或手机访问已经通过。

2026-10-17部署过程：服务器Docker Hub超时，改用官方crane发行包（SHA256核验）在本机拉取相同官方linux/amd64镜像，再经固定证书校验的临时TLS通道传到实例；服务器再次校验SHA256后docker load。未使用公共中转存储、随机Docker镜像站或绕过TLS。Debian原站下载长时间无进展，Compose构建参数改用阿里云官方HTTPS开源镜像站；apt包签名校验保持开启。源码归档SHA256及镜像传输证据见docs/artifacts/下相关JSON；Dockerfile/Compose随后修改了构建镜像站参数，原归档保留用于审计。

部署完成证据：公网未认证401、HTTP转HTTPS308、认证主页200；私有配置路径404；Secure/HttpOnly/SameSite Cookie；带Origin的四轮真实问答与DeepSeek评价通过。证据 `docs/artifacts/live/aliyun-https.json`。单轮约0.916–1.192秒，末轮含评价2.327秒，仅为本次服务器短样本，不承诺手机延迟和并发。手机登录由用户确认，媒体、视觉同意截图、音色人工选择和PNG真机保存仍待反馈。
