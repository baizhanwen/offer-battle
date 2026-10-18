"""Synthetic media + mock transport. These tests do not prove live API entitlement."""
import io
import math
import struct
import wave
import pytest
from PIL import Image
from app import providers
from app.main import Session


def short_wav():
    b=io.BytesIO()
    with wave.open(b,'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(16000)
        w.writeframes(b''.join(struct.pack('<h',int(5000*math.sin(i*2*math.pi*440/16000))) for i in range(3200)))
    return b.getvalue()


@pytest.mark.asyncio
async def test_asr_normalizes_to_wav_and_full_upload(monkeypatch):
    captured={}
    async def mock(name,url,**kw):
        captured.update(kw);assert name=='MINIMAX_ASR';return {'text':'我先检查，再和同学确认。'}
    monkeypatch.setattr(providers,'post',mock)
    text=await providers.transcribe(short_wav())
    assert text.startswith('我先检查')
    filename,raw,mime=captured['files']['file']
    assert filename=='answer.wav' and mime=='audio/wav' and raw[:4]==b'RIFF'
    assert captured['data']['stream']=='false'
    with wave.open(io.BytesIO(raw),'rb') as w:
        assert w.getframerate()==16000 and w.getnchannels()==1


@pytest.mark.asyncio
async def test_tts_full_reply_and_question_decodes_hex(monkeypatch):
    async def mock(name,url,**kw):
        assert name=='MINIMAX_TTS'
        assert kw['json']['text']=='记录完成。\n你先做哪一步？'
        assert kw['json']['stream'] is False
        assert kw['json']['voice_setting']['voice_id']=='Chinese (Mandarin)_Reliable_Executive'
        return {'data':{'audio':('ff'*200)}}
    monkeypatch.setattr(providers,'post',mock)
    s=Session('test','slack_off_artist','cyber_judge_k07','video')
    assert len(await providers.speak(s,'记录完成。\n你先做哪一步？'))==200


@pytest.mark.asyncio
async def test_vision_reencodes_removes_metadata_and_checks_facts(monkeypatch):
    im=Image.new('RGB',(1200,900),'blue');buf=io.BytesIO();im.save(buf,'PNG')
    async def mock(name,url,**kw):
        assert name=='MINIMAX_VISION'
        url=kw['json']['messages'][1]['content'][1]['image_url']['url']
        assert url.startswith('data:image/jpeg;base64,')
        return {'choices':[{'message':{'content':'{"clothing":[],"objects":[],"background":["蓝色背景"]}'}}]}
    monkeypatch.setattr(providers,'post',mock)
    assert (await providers.vision(buf.getvalue()))['background']==['蓝色背景']
    with pytest.raises(providers.ProviderError):await providers.vision(b'not an image')


@pytest.mark.asyncio
async def test_transport_status_redacted_and_key_independence(monkeypatch):
    import httpx
    monkeypatch.setenv('DEEPSEEK_ENABLED','false');monkeypatch.setenv('MINIMAX_KEY_TYPE','subscription')
    monkeypatch.setenv('MINIMAX_ASR_ENABLED','true');monkeypatch.setenv('MINIMAX_ASR_KEY','synthetic-test-secret')
    assert providers.capabilities()['MINIMAX_ASR'] and not providers.capabilities()['DEEPSEEK']
    original=httpx.AsyncClient
    def respond(request):
        assert request.headers['Authorization']=='Bearer synthetic-test-secret'
        return httpx.Response(401,json={'secret':'synthetic-test-secret'})
    monkeypatch.setattr(providers.httpx,'AsyncClient',lambda **kw:original(transport=httpx.MockTransport(respond),**kw))
    with pytest.raises(providers.ProviderError) as e:await providers.post('MINIMAX_ASR','https://example.test/v1/speech_to_text',json={})
    assert '401' in str(e.value) and 'synthetic-test-secret' not in str(e.value)


@pytest.mark.asyncio
@pytest.mark.parametrize('payload',[None,[],{'base_resp':None},{'base_resp':[]},{'base_resp':{'status_code':'0'}}])
async def test_malformed_transport_json_is_a_provider_failure(monkeypatch,payload):
    import httpx
    monkeypatch.setenv('DEEPSEEK_ENABLED','true');monkeypatch.setenv('DEEPSEEK_API_KEY','synthetic-test-secret')
    original=httpx.AsyncClient
    monkeypatch.setattr(providers.httpx,'AsyncClient',lambda **kw:original(transport=httpx.MockTransport(lambda r:httpx.Response(200,json=payload)),**kw))
    with pytest.raises(providers.ProviderError) as error:
        await providers.deepseek([{'role':'user','content':'测试'}])
    assert 'synthetic-test-secret' not in str(error.value)


@pytest.mark.asyncio
@pytest.mark.parametrize('repair_succeeds', [True, False])
async def test_reverse_whitespace_json_repair_is_bounded(monkeypatch, repair_succeeds):
    from app.main import Session
    s = Session('test-owner', 'slack_off_artist', 'slacking_senior', 'reverse')
    calls = []
    async def mock_post(name, url, **kw):
        calls.append(kw['json']['messages'].copy())
        content = '{"reply":"先完成模板，再抽查三行。"}' if repair_succeeds and len(calls) == 2 else '   '
        return {'choices': [{'message': {'content': content}}]}
    monkeypatch.setattr(providers, 'post', mock_post)
    if repair_succeeds:
        assert await providers.reverse(s, '怎么处理重复表格？') == '先完成模板，再抽查三行。'
    else:
        with pytest.raises(providers.ProviderError, match='连续两次'):
            await providers.reverse(s, '怎么处理重复表格？')
    assert len(calls) == 2 and not s.history
