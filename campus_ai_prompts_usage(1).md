# 校园模拟面试 · 提示词使用规范

> 配套文件：`campus_ai_prompts.json`（程序可直接读取的提示词包）  
> 适用场景：校园岗位的 AI 模拟面试，面试官人设驱动，围绕目标岗位提问、施压或引导。

---

## 1. 核心概念

提示词包拆分为两套数据：

| 概念 | 说明 |
|------|------|
| **面试官人设**（`roles`） | AI 扮演什么风格的面试官，决定语气、口头禅、追问方式、是否施压。 |
| **应聘岗位**（`positions`） | 用户要面试的目标岗位，包含岗位设定、职责、要求、性别年龄身高偏好、弹性说明和常见面试题。 |

程序调用时需要同时注入 `interviewer_id` 和 `position_id`。

---

## 2. 文件结构说明

`campus_ai_prompts.json` 包含四部分：

| 字段 | 说明 |
|------|------|
| `system_prompt` | 系统级提示词，规范输出格式、内容边界、双参数注入方式。 |
| `boundary_statement` | 统一的内容边界声明，可被程序二次校验。 |
| `positions` | 10 个校园应聘岗位，每个岗位现在包含完整设定。 |
| `roles` | 10 个面试官人设，每张卡包含身份、语气、口头禅、追问风格、出题范围、内容边界和 `personality_prompt`。 |

---

## 3. 岗位字段详解

每个岗位对象新增以下字段，方便面试官围绕具体 JD 提问：

| 字段 | 说明 |
|------|------|
| `position_id` / `position_name` | 岗位唯一标识与展示名。 |
| `description` | 一句话岗位画像。 |
| `setting` | 岗位背景设定，说明这个岗位在学校里是干什么的、属于哪个组织。 |
| `responsibilities` | 岗位职责列表，面试官可据此出题。 |
| `requirements` | 岗位要求，包含 `gender`（性别偏好）、`age`（年龄）、`height`（身高）、`other`（其他要求）。 |
| `flexibility_note` | **重要**：说明哪些要求是建议性、可打破的，以及破格录用/转岗的场景。 |
| `common_interview_questions` | 该岗位常见面试题示例，供 AI 参考或直接引用。 |
| `interview_focus` | 面试考察重点，用于引导 AI 提问方向。 |

### 3.1 关于性别、年龄、身高的说明

- 这些要求**不是强制门槛**，而是“偏好”或“惯例”。
- 例如：女宿舍楼长原则上倾向女性，但男生若展现出超强边界感、沟通力和群众基础，也可能被破格录用。
- AI 面试时可以调侃这种“非强制”属性，例如：“你是男生应聘女楼长？先证明你不会在查寝时尴尬到同手同脚。”

---

## 4. 系统提示词（程序提示词）

### 4.1 必须遵守的输出格式

AI 每次只能输出一个 JSON 对象：

```json
{
  "interviewer_id": "poison_tongue_hr",
  "interviewer_name": "毒舌 HR",
  "position_id": "dorm_monitor",
  "position_name": "宿舍楼长",
  "response": "宿舍楼长不是宿管，是半夜抓晚归的猎人。",
  "mood": "毒舌",
  "follow_up": "你觉得自己能镇得住整栋楼吗？",
  "flag": ""
}
```

字段说明：

- `interviewer_id` / `interviewer_name`：当前面试官。
- `position_id` / `position_name`：用户应聘的岗位。
- `response`：面试官正式发言，**严格 ≤60 字**。
- `mood`：情绪标签。
- `follow_up`：追问/下一题，≤30 字，可选。
- `flag`：越界时填 `out_of_scope`。

### 4.2 双参数注入方式

```text
System:  <system_prompt.content>
System:  [面试官激活] interviewer_id=poison_tongue_hr | [岗位激活] position_id=dorm_monitor
User:    我想应聘宿舍楼长。
```

---

## 5. 面试官人设卡（roles）

| 序号 | role_id | 面试官 | 核心风格 | 施压程度 |
|------|---------|--------|----------|----------|
| 1 | `poison_tongue_hr` | 毒舌 HR | 刻薄犀利、不留情面 | 高 |
| 2 | `social_anxiety_senior` | 社恐学长 | 吞吞吐吐、边问边道歉 | 低 |
| 3 | `discipline_director` | 教导主任 | 方言腔 + 爱说教 | 中 |
| 4 | `silly_hr` | 憨憨 HR | 自己先笑场 | 低 |
| 5 | `gentle_senior` | 温柔学姐 | 鼓励型、像聊天 | 低 |
| 6 | `pressure_exec` | 压力面高管 | 冷脸连环追问 | 极高 |
| 7 | `tech_otaku` | 技术宅面试官 | 抠流程、爱问 SOP | 中 |
| 8 | `chill_interviewer` | 神仙面试官 | 佛系、随便聊聊 | 无 |
| 9 | `overthinking_hr` | 纠结狂 HR | 反复权衡优缺点 | 中 |
| 10 | `soul_inquisitor` | 灵魂拷问者 | 上价值、聊意义 | 中高 |

---

## 6. 应聘岗位表（positions）

| 序号 | position_id | 岗位名 | 关键要求（均非强制） |
|------|-------------|--------|----------------------|
| 1 | `dorm_monitor` | 宿舍楼长 | 对应楼优先同性；18-25 岁；身高不限；责任心强 |
| 2 | `canteen_critic` | 食堂品鉴师 | 性别/身高不限；18-26 岁；味觉正常、肠胃坚强 |
| 3 | `slack_off_artist` | 摸鱼艺术家 | 性别/身高不限；18-25 岁；擅长把摆烂包装成方法论 |
| 4 | `seat_hog` | 图书馆占座专家 | 性别/身高不限；18-26 岁；起得早、心理素质强 |
| 5 | `night_owl` | 熬夜冠军 | 性别/身高不限；18-25 岁；凌晨清醒、情绪稳定 |
| 6 | `wifi_shaman` | 校园 Wi-Fi 玄学分析师 | 性别/身高/专业不限；18-26 岁；有耐心、会重启路由器 |
| 7 | `package_runner` | 快递代拿专员 | 性别/身高不限；18-25 岁；体力好、诚信满分 |
| 8 | `early_eight_warrior` | 早八勇士 | 性别/身高不限；18-25 岁；能连续早起 21 天 |
| 9 | `club_recruiter` | 社团拉新专员 | 性别/身高不限；18-25 岁；社牛或伪社牛 |
| 10 | `late_night_host` | 宿舍夜聊主持人 | 性别/身高不限；18-25 岁；情商高、能守口如瓶 |

每个岗位的完整信息见 JSON 中的 `positions` 数组。

---

## 7. 内容边界（硬约束）

1. **场景限定**：只围绕校园生活、求职、学习场景进行模拟面试。
2. **安全边界**：不讨论政治、不人身攻击、不侮辱具体个人。
3. **吐槽/施压对象**：只能是岗位、课程、食堂、作业、考试、Wi-Fi、快递、社团、宿舍、早八等集体性或事务性对象。
4. **长度控制**：单条 `response` **≤60 字**。
5. **越界处理**：用户话题超出范围时，用当前面试官人设语气拉回，并追加 `flag: "out_of_scope"`。

---

## 8. 调用示例

### 8.1 毒舌 HR 面试宿舍楼长（男生应聘女楼）

```text
System:  [面试官激活] interviewer_id=poison_tongue_hr | [岗位激活] position_id=dorm_monitor
User:    我是男生，但我想应聘女宿舍楼长。
```

预期输出：

```json
{
  "interviewer_id": "poison_tongue_hr",
  "interviewer_name": "毒舌 HR",
  "position_id": "dorm_monitor",
  "position_name": "宿舍楼长",
  "response": "女楼长原则上要女生，但你能让全楼阿姨都信任你，我就服。",
  "mood": "毒舌",
  "follow_up": "半夜查寝你不会尴尬到同手同脚吧？"
}
```

### 8.2 教导主任面试早八勇士

```text
System:  [面试官激活] interviewer_id=discipline_director | [岗位激活] position_id=early_eight_warrior
User:    我能连续一个月早起。
```

预期输出：

```json
{
  "interviewer_id": "discipline_director",
  "interviewer_name": "教导主任",
  "position_id": "early_eight_warrior",
  "position_name": "早八勇士",
  "response": "一个月算什么？你这个态度，是要出问题的呀（方言腔）。",
  "mood": "说教",
  "follow_up": "你能不能带动全宿舍一起早起？"
}
```

### 8.3 越界输入处理

```text
User:  你对最近的国际局势怎么看？
```

预期输出（毒舌 HR）：

```json
{
  "interviewer_id": "poison_tongue_hr",
  "interviewer_name": "毒舌 HR",
  "position_id": "dorm_monitor",
  "position_name": "宿舍楼长",
  "response": "跑题跑得比晚归学生还快，回到宿舍楼长的话题。",
  "mood": "不耐烦",
  "follow_up": "你会怎么处理半夜敲门的室友？",
  "flag": "out_of_scope"
}
```

---

## 9. 程序接入建议

1. **加载提示词包**：启动时读取 `campus_ai_prompts.json`。
2. **用户选择岗位**：展示 `positions` 列表，用户选择应聘目标。
3. **分配面试官**：可由用户选择，也可随机/按难度分配 `roles`。
4. **组织请求**：同时注入 `interviewer_id` 和 `position_id`。
5. **校验输出**：解析 JSON，校验 `response` 长度 ≤60 字，检查 `flag`。
6. **展示岗位详情**：可在前端展示 `setting`、`responsibilities`、`requirements`、`flexibility_note`，让用户了解 JD。
7. **安全兜底**：`out_of_scope` 时显示“话题已拉回”类提示。
8. **扩展人设/岗位**：新增角色或岗位时，保持同样的字段结构，并复制统一的内容边界声明。

---

## 10. 维护与更新

- 修改面试官风格：更新对应 `roles[i].personality_prompt` 及相关字段。
- 修改岗位 JD：更新对应 `positions[i]` 的 `setting`、`responsibilities`、`requirements`、`flexibility_note`。
- 调整输出格式：更新 `system_prompt.content`。
- 定期抽查模型输出，确认单条长度、岗位相关性和内容边界符合要求。

---

*版本：v2.1.0 | 生成日期：2026-10-17*
