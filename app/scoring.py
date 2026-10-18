"""Deterministic 30% component, no length bonus and no visual claims."""
import math
import re

DIMENSIONS = ['抗压能力', '脸皮厚度', '离谱程度', '眼神坚定度', '就业潜力']
DECISIONS = {
    'hired': ('录用', '准予试岗，明天带着你的奇思妙想来报到。'),
    'pending': ('待定', '暂缓盖章，补一份更具体的方案再来聊聊。'),
    'rejected': ('淘汰', '本次未录用，这份校园岗位与你暂时没对上频道。'),
    'insufficient': ('未评定', '有效回答不足，先休息一下，欢迎下次重新开局。'),
}


def classify(scores):
    avg = sum(scores) / 5
    return 'hired' if avg >= 6.5 else 'pending' if avg >= 3.5 else 'rejected'


def rule_scores(answers, max_questions):
    meaningful = [a['text'] for a in answers if a['kind'] == 'answer' and
                  a['text'].strip() not in ('我不知道', '我不配') and
                  re.search(r'[\w\u4e00-\u9fff]', a['text'])]
    # Unique contributions, plans, fallback, collaboration; all binary, capped.
    unique = len(set(meaningful))
    joined = ' '.join(meaningful)
    signals = {
        '行动': bool(re.search('先|检查|确认|安排|记录|做|问|联系|用|试', joined)),
        '应变': bool(re.search('如果|万一|出错|备用|不行|兜底|失败|调整|否则|抽查', joined)),
        '协作': bool(re.search('一起|队友|同学|室友|沟通|协商|听|反馈|边界|公平', joined)),
        '创意': bool(re.search('脚本|自动|魔法|猫|摸鱼|玄学|宇宙|机器人|代码|路由器', joined)),
    }
    participation = min(3, unique)
    values = [3 + participation + 2 * signals['应变'],
              3 + participation + signals['协作'],
              3 + participation + 2 * signals['创意'],
              3 + participation + signals['行动'],
              2 + participation + signals['行动'] + signals['应变'] + signals['协作']]
    return [min(10, int(v)) for v in values], {
        'effective_answers': len(meaningful), 'unique_answers': unique,
        'counted_turns': len(answers), 'max_questions': max_questions,
        'signals': signals, 'formula': '基础分 + min(3, 不重复有效回答数) + 行为信号；无字数奖励；思考和澄清不进入评分',
    }


def build_result(s, ai=None):
    rule, evidence = rule_scores(s.answers, s.max_questions)
    scores = [max(1, min(10, math.floor(.7 * a + .3 * b + .5))) for a, b in zip(ai['scores'], rule)] if ai else rule
    status = classify(scores) if evidence['effective_answers'] else 'insufficient'
    if status == 'insufficient':
        scores = [1] * 5
    label, comment = DECISIONS[status]
    observed = [name for name, present in evidence['signals'].items() if present]
    if evidence['effective_answers']:
        comment += ('答卷里有' + '、'.join(observed[:2]) + '的线索。') if observed else f"已收到{evidence['effective_answers']}条有效作答。"
    return dict(number=s.offer_number, scores=dict(zip(DIMENSIONS, scores)), average=round(sum(scores) / 5, 1),
                status=status, label=label, comment=comment,
                observation=ai['observation'] if ai and status != 'insufficient' else '人事部看的是方案里的行动和应变，字数不决定表现。',
                scoring_source='AI 评价 70% + 规则 30%' if ai else '演示模式 · 本地规则与模板',
                ai_scores=ai['scores'] if ai else None, rule_scores=rule, evidence=evidence,
                entertainment_note='校园游戏娱乐评分，不用于真实招聘。眼神坚定度为回答表现的游戏指标，未测量眼神。')
