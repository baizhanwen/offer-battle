"""Bounded, explicit demonstration responses; never pretend to be a live model."""
from .catalog import ROLES, POSITIONS

OPENINGS = [
    '岗位档案已载入。今天审核你的执行方案。',
    '嗯……这岗有点意思，先聊两句再下班。',
    '咱这卦，只算回答。今日宜递交一份校园奇策。',
    '愿这份小小的工作，给普通的一天留一点光。',
    '这岗位让我想起当年的社团……收住，先听你说！',
]


def local_reply(s, phase, text='', action='answer'):
    role, job = ROLES[s.role_id], POSITIONS[s.position_id]
    i = list(ROLES).index(s.role_id)
    snippet = text.replace('\n', ' ')[:12].replace('？', '').replace('?', '')
    questions = job['common_interview_questions'] + ['如果方案没奏效，你会怎样调整？', '队友有不同意见时，你会怎么沟通？', '最后怎样确认这件事已经完成？']
    q = questions[min(s.turns, 5)]
    if s.turns and action == 'answer' and text not in ('我不知道', '我不配'):
        # Concrete next step tied to the last answer, in addition to job context.
        q = ['这一步出错时，你怎样及时发现？', '队友不配合时，你先做什么？',
             '给这个方案补一个备用计划？', '截止时间提前了，你会怎样安排？',
             '你怎样向同学说明这份方案？'][min(s.turns - 1, 4)]
    reactions = [f'已记录「{snippet}」。方案还需要一个执行检查。',
                 f'「{snippet}」，给省力计划加个兜底就更稳了。',
                 f'「{snippet}」，这签文落在了行动上。',
                 f'「{snippet}」，是你留给这个岗位的一小束光。',
                 f'「{snippet}」让我想到小组作业。扯远了，回到岗位。']
    reply = OPENINGS[i] if phase == 'opening' else reactions[i]
    if text in ('我不知道', '我不配'):
        reply = ['信息不足不等于能力不足。从一步开始。', '先别给自己退简历。挑一件小事聊聊。',
                 '此签宜从小处落笔。咱先不急。', '先别否定自己。一小步，也值得记下来。',
                 '我第一次也卡壳！收住，咱把问题缩小点。'][i]
        q = f"从{job['responsibilities'][0][:12]}开始，你先做什么？"[:30]
    if action == 'skip':
        reply = '这道题已跳过，记入题数。换个岗位情境继续。'
    if phase == 'closing':
        snippet = next((a['text'][:12] for a in reversed(s.answers) if a['kind'] == 'answer'), '')
        reply = (f'「{snippet}」已记入答卷。' if snippet else '本局答卷已封存。') + [
            '记录完成，转交人事部盖章。', '行，先下班，答卷交人事部了。', '收卦，结论请看人事部批示。',
            '愿下次相遇，你的答案依旧有光。', '今天先收麦，人事部准备盖章！'][i]
        q = ''
    return dict(interviewer_id=s.role_id, interviewer_name=role['role_name'],
                position_id=s.position_id, position_name=job['position_name'], reply=reply[:60],
                follow_up=q[:30], stage='feedback' if phase == 'closing' else 'question',
                finished=phase == 'closing', mood=role['mood_tags'][-1 if phase == 'closing' else 0], flag='')


def reverse_local(job, question, verdict=None):
    if verdict == 'hire':
        return '录取了！我把闹钟改成上班铃。放心，第一天先认清岗位职责，再研究午饭。'
    if verdict == 'reject':
        return '收到，简历先回宿舍充电。下次我带着更具体的方案再来敲门。'
    return f'关于「{question[:18]}」，我应聘{job["position_name"]}的方案是：先把基本任务做稳，再给突发状况留条后路。午饭前我能交第一版！'
