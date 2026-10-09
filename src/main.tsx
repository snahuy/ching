import { SettingsPage, GearIcon } from './SettingsPage';
import { AppPreferencesProvider, useAppPreferences } from './AppPreferencesContext';
import { pauseMoveDeadline, resumeMoveDeadline } from './appPreferences';
import './settings.css';
import { SoloGameResult } from './SoloGameResult';
import { revealedMoveLabel, soloAnnouncement, gameAnnouncement } from './roundPresentation';
import { ActivityBar, ActivityFeed, ReactionBubble, useReactionMute } from './ActivityUI';
import { createActivity, appendActivity, addReaction, botRoundReaction, soloRoundActivity, type ActivityPayload, type ReactionId, type ActivityActor } from './activity';
import { LanguageProvider, useLanguage } from './i18n/react';
import { BattleShell, BattleMenu, BattleSheet, MovePanel, MoveHelp } from './BattleUI';
import { roundMessage } from './i18n/core';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { DEFAULT_RULES, MOVES, MOVE_LIST, resolveRound, type MoveId, type RuleOptions } from './rules';
import { chooseAI, type Difficulty } from './ai';
import { DEFAULT_MATCH_SETTINGS, INTERMISSION_MS } from './match';
import { CharacterSelect } from './CharacterSelect';
import { readPreferences, savePreferences, validPlayerName } from './preferences';
import { MatchOptions } from './MatchOptions';
import { createSolo, finishSoloGame, nextSoloGame, deadlineMove, type SoloSession } from './solo';
import { Gesture } from './Gesture';
import { Avatar } from './Avatar';
import { AvatarPicker } from './AvatarPicker';
import { Character } from './Character';
import { characterState, ROUND_TIMING } from './characterState';
import { Multiplayer } from './multiplayer/Multiplayer';
import { DEFAULT_PROFILE, avatarById, readProfile, saveProfile, type AvatarProfile } from './avatars';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/space-grotesk/latin-400.css';
import '@fontsource/space-grotesk/latin-500.css';
import '@fontsource/space-grotesk/latin-600.css';
import '@fontsource/space-grotesk/latin-700.css';
import '@fontsource/noto-sans-khmer/400.css';
import '@fontsource/noto-sans-khmer/600.css';
import '@fontsource/noto-sans-khmer/700.css';
import './style.css';
import './avatars.css';
import './characters.css';
import './mobile.css';
import './battle.css';

function App() {
  const { t, language, move: moveLabel } = useLanguage();
  const [preferences] = useState(() => readPreferences(window.localStorage));
  const [playerName, setPlayerName] = useState(preferences.name);
  const [profile, setProfile] = useState<AvatarProfile>(() => { try { return readProfile(window.localStorage); } catch { return { ...DEFAULT_PROFILE }; } });
  const [picker, setPicker] = useState(false);
  const pickerOpener = useRef<HTMLElement | null>(null);
  const [screen, setScreen] = useState<'home' | 'setup' | 'game' | 'multiplayer'>(() => new URLSearchParams(location.search).has('room') ? 'multiplayer' : 'home');
  const [difficulty, setDifficulty] = useState<Difficulty>(preferences.difficulty);
  const [rules, setRules] = useState<RuleOptions>({ ...DEFAULT_RULES });
  const [settings, setSettings] = useState(preferences.settings);
  const [settingsValid, setSettingsValid] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [session, setSession] = useState<SoloSession>(() => createSolo('normal', DEFAULT_MATCH_SETTINGS));
  const [privateBattle, setPrivateBattle] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pausedMove = useRef<number | null>(null);
  const {preferences:appPreferences,update:updateAppPreferences}=useAppPreferences();
  const {muted,reduced}=appPreferences;
  const setMuted=(value:boolean)=>updateAppPreferences('muted',value);
  const setReduced=(value:boolean)=>updateAppPreferences('reduced',value);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [matchSummaryVisible, setMatchSummaryVisible] = useState(false);
  const [activity, setActivity] = useState(() => createActivity(crypto.randomUUID()));
  const activityRef = useRef(activity);
  const reactionTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const reactions = useReactionMute();
  const [help, setHelp] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audio = useRef<AudioContext | null>(null);
  const submitting = useRef(false);
  const helpRef = useRef<HTMLDialogElement>(null);
  const endRef = useRef<HTMLDialogElement>(null);
  const helpButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { savePreferences(window.localStorage, { name: playerName, difficulty, settings }); }, [playerName, difficulty, settings]);
  const latest = session.history.at(-1);
  const busy = session.phase !== 'choose';
  useEffect(() => { if (help) helpRef.current?.showModal(); else helpRef.current?.close(); }, [help, screen, privateBattle]);
  useEffect(() => {
    if (screen !== 'game' || session.phase !== 'over') return;
    const timer = setTimeout(() => setMatchSummaryVisible(true), INTERMISSION_MS);
    return () => clearTimeout(timer);
  }, [screen, session.phase, session.gameNumber]);
  useEffect(() => { if (screen === 'game' && matchSummaryVisible && !settingsOpen) endRef.current?.showModal(); }, [screen, matchSummaryVisible, settingsOpen]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); reactionTimers.current.forEach(clearTimeout); void audio.current?.close(); }, []);
  useEffect(() => {
    if (screen !== 'game' || session.phase !== 'choose' || settingsOpen) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 100);
    const timeout = setTimeout(() => submit('block1'), Math.max(0, session.deadline - Date.now()));
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [screen, session.phase, session.deadline, settingsOpen]);
  useEffect(() => {
    if (screen !== 'game' || session.phase !== 'intermission') return;
    const timer = setTimeout(() => { submitting.current = false; setNow(Date.now()); setSession(s => nextSoloGame(s, difficulty, settings)); }, INTERMISSION_MS);
    return () => clearTimeout(timer);
  }, [screen, session.phase, session.gameNumber]);
  useEffect(() => { if (settingsOpen && screen === 'game' && session.phase === 'choose' && pausedMove.current === null) pausedMove.current = pauseMoveDeadline(session.deadline); }, [settingsOpen, screen, session.phase, session.deadline]);
  function openSettings() { if (screen === 'game' && session.phase === 'choose') pausedMove.current = pauseMoveDeadline(session.deadline); setSettingsOpen(true); }
  function closeSettings() { if (pausedMove.current !== null && screen === 'game' && session.phase === 'choose') { const deadline=resumeMoveDeadline(pausedMove.current); setNow(Date.now()); setSession(s=>({...s,deadline})); } pausedMove.current=null; setSettingsOpen(false); }
  function tone(frequency: number, duration = 0.08) {
    if (muted) return;
    try {
      audio.current ??= new AudioContext();
      const ctx = audio.current;
      void ctx.resume();
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = 'triangle'; osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.13, ctx.currentTime + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + duration);
    } catch { /* The game also works in browsers without audio support. */ }
  }
  function start() { pausedMove.current=null; setSettingsOpen(false); setMatchSummaryVisible(false); reactionTimers.current.forEach(clearTimeout); reactionTimers.current.clear(); activityRef.current = { ...createActivity(crypto.randomUUID()), cooldowns: activityRef.current.cooldowns }; setActivity(activityRef.current); timers.current.forEach(clearTimeout); timers.current = []; submitting.current = false; setNow(Date.now()); setSession(createSolo(difficulty, settings, profile)); setScreen('game'); tone(500); }
  function openPicker() { pickerOpener.current = document.activeElement as HTMLElement; setPicker(true); }
  function closePicker() { setPicker(false); requestAnimationFrame(() => pickerOpener.current?.focus()); }
  function selectProfile(next: AvatarProfile) {
    setProfile(next);

    try { saveProfile(window.localStorage, next); } catch { /* Storage may be unavailable in private browsing. */ }
    if (picker) closePicker();
  }
  function soloActors(): ActivityActor[] { return [{ id: 'player', name: playerName.trim(), profile: { ...profile } }, { id: 'ai', name: 'Bot', profile: { ...session.aiProfile } }]; }
  function recordActivity(key: string, payload: ActivityPayload) { activityRef.current = appendActivity(activityRef.current, key, payload, Date.now()); setActivity(activityRef.current); }
  function sendSoloReaction(reaction: ReactionId, requestId: string) {
    try { activityRef.current = addReaction(activityRef.current, soloActors()[0], reaction, requestId, Date.now()); setActivity(activityRef.current); return true; } catch { return false; }
  }
  function queueSoloReaction(reaction: ReactionId, key: string) {
    const matchId = activityRef.current.matchId, actor = soloActors()[1];
    const timer = setTimeout(() => {
      reactionTimers.current.delete(timer);
      if (activityRef.current.matchId !== matchId) return;
      if (Date.now() < (activityRef.current.cooldowns.ai ?? 0)) { queueSoloReaction(reaction, key); return; }
      activityRef.current = addReaction(activityRef.current, actor, reaction, key, Date.now()); setActivity(activityRef.current);
    }, Math.max(250, (activityRef.current.cooldowns.ai ?? 0) - Date.now()));
    reactionTimers.current.add(timer);
  }
  function submit(requestedMove: MoveId) {
    const move = deadlineMove(requestedMove, session.deadline);
    const timedOut = Date.now() >= session.deadline;
    if (settingsOpen || submitting.current || session.phase !== 'choose' || MOVES[move].cost > session.playerAmmo) return;
    submitting.current = true;
    // Read the already-committed AI move, never call chooseAI with this choice.
    const result = resolveRound(session.playerAmmo, session.aiAmmo, move, session.lockedAI, rules);
    const history = [...session.history, result];
    setSession(s => ({ ...s, phase: 'countdown', chosen: move, count: 3, timedOut }));
    tone(360);
    const beat = reduced ? ROUND_TIMING.reducedClapBeat : ROUND_TIMING.clapBeat;
    for (const [index, count] of [2, 1].entries()) timers.current.push(setTimeout(() => { setSession(s => ({ ...s, count })); tone(420 + index * 80); }, beat * (index + 1)));
    timers.current.push(setTimeout(() => {
      setSession(s => ({ ...s, playerAmmo: result.playerAmmo, aiAmmo: result.aiAmmo, history, botHistory: [...s.botHistory, result], phase: 'reveal' }));
      const roundEvent = soloRoundActivity(result, session.gameNumber, history.length, soloActors());
      recordActivity('round:' + session.gameNumber + ':' + history.length, roundEvent);
      if (roundEvent.kind === 'round') { const reaction = botRoundReaction('ai', roundEvent.attacks, ['player']); if (reaction) queueSoloReaction(reaction, 'bot-round-' + session.gameNumber + '-' + history.length); }
      tone(result.outcome === 'player' ? 740 : result.outcome === 'ai' ? 180 : 570, 0.16);
    }, beat * 3));
    timers.current.push(setTimeout(() => {
      setSession(s => ({ ...s, phase: 'reaction' }));
    }, beat * 3 + ROUND_TIMING.move));
    timers.current.push(setTimeout(() => {
      if (result.outcome !== 'continue') {
        const finished = finishSoloGame({ ...session, chosen: move, timedOut, playerAmmo: result.playerAmmo, aiAmmo: result.aiAmmo, history, botHistory: [...session.botHistory, result] }, settings);
        setSession(finished);
        recordActivity('game:' + session.gameNumber, { kind: 'game', game: session.gameNumber, actors: soloActors(), winnerId: result.outcome === 'draw' ? null : result.outcome, scores: { ...finished.progress.scores } });
        if (finished.progress.championId) {
          recordActivity('match-winner', { kind: 'match', actors: soloActors(), winnerId: finished.progress.championId, wins: finished.progress.scores[finished.progress.championId] });
          queueSoloReaction('goodGame', 'bot-match');
        } else if (result.outcome === 'player' && Math.random() < 0.5) queueSoloReaction('wellPlayed', 'bot-game-' + session.gameNumber);
      }
      else {
        const lockedAI = chooseAI({ playerAmmo: result.playerAmmo, aiAmmo: result.aiAmmo, history: [...session.botHistory, result] }, difficulty);
        setSession(s => ({ ...s, phase: 'choose', chosen: undefined, lockedAI, deadline: Date.now() + settings.roundSeconds * 1000, timedOut: false }));
        submitting.current = false;
      }
      timers.current = [];
    }, beat * 3 + (result.outcome === 'continue' ? ROUND_TIMING.continuingReveal : ROUND_TIMING.finalReveal)));
  }
  const shown = session.phase === 'reveal' || session.phase === 'reaction' || session.phase === 'intermission' || session.phase === 'over';
  const currentRound = session.history.length + (shown ? 0 : 1);
  const announcement = latest ? session.phase === 'intermission' || session.phase === 'over' ? gameAnnouncement(language, session.gameNumber, latest.outcome === 'draw' ? null : latest.outcome === 'player' ? playerName.trim() : 'Bot', `${playerName.trim()} ${session.progress.scores.player}, Bot ${session.progress.scores.ai}`) : soloAnnouncement(language, latest, playerName.trim(), 'Bot') : null;
  return <div className={`app ${screen === 'game' || privateBattle ? 'battle-app' : ''} ${reduced ? 'reduced' : ''}`}>
    {screen !== 'game' && !privateBattle && <header className="header compact-header" inert={settingsOpen}>{screen === 'setup' ? <div className="setup-title"><button className="back-button" aria-label={t('Back')} onClick={() => setScreen('home')}>←</button><h1>{t('Single Player')}</h1></div> : <button className="brand" onClick={() => { timers.current.forEach(clearTimeout); timers.current = []; submitting.current = false; setScreen('home'); }} aria-label={t('Ching home')}><span className="brand-icon" aria-hidden="true">✳</span> ching<span className="brand-dot">.</span></button>}<div className="header-actions">{!picker && !help && <button className="settings-gear" aria-label={t('Settings')} onClick={openSettings}><GearIcon/></button>}</div></header>}
    <main inert={settingsOpen}>
      {picker && <AvatarPicker profile={profile} onSave={selectProfile} onClose={closePicker} reduced={reduced}/>}
      {screen === 'multiplayer' ? <Multiplayer profile={profile} reduced={reduced} onChooseAvatar={openPicker} onSelectProfile={selectProfile} onBattleChange={setPrivateBattle} onSettings={openSettings} muted={muted} onMute={() => setMuted(!muted)} onReduced={setReduced} onHelp={() => setHelp(true)} onExit={() => setScreen('home')}/> : screen === 'home' ? <section className="mobile-home">
        <div className="home-stage"><div className="stage-disc"/><div className="home-character"><Character profile={profile} state="ching" reduced={reduced}/></div><div className="home-character rival"><Character profile={session.aiProfile} state="block1" facing="left" reduced={reduced}/></div></div>
        <div className="home-modes"><button className="mode-button primary-mode" onClick={() => setScreen('setup')}><span><strong>{t('Single Player')}</strong><span>{t('Play against a bot')}</span></span><b aria-hidden="true">→</b></button><button className="mode-button secondary-mode" onClick={() => setScreen('multiplayer')}><span><strong>{t('Multiplayer')}</strong><span>{t('Play with friends')}</span></span><b aria-hidden="true">→</b></button></div>
        <div className="home-tools"><button className="text-control" onClick={() => setMuted(!muted)} aria-pressed={!muted}>{t(muted ? 'Sound off' : 'Sound on')}</button><button ref={helpButton} className="text-control" onClick={() => setHelp(true)}>{t('How to play')}</button></div>
      </section> : screen === 'setup' ? <section className="solo-setup">
        <CharacterSelect profile={profile} onSelect={selectProfile} onMore={openPicker} reduced={reduced}/>
        <div className="setup-choices"><label className="name-field">{t('Your name')}<input value={playerName} autoComplete="nickname" maxLength={20} onChange={e => setPlayerName(e.target.value)} aria-invalid={!validPlayerName(playerName)}/></label>{!validPlayerName(playerName) && <p className="room-error" role="alert">{t('Enter a name of 1–20 characters.')}</p>}
        <div className="setup-difficulty"><h2>{t('Bot difficulty')}</h2><div className="segmented" role="group" aria-label={t('Difficulty')}>{(['easy', 'normal', 'hard'] as const).map(d => <button key={d} className={difficulty === d ? 'active' : ''} onClick={() => setDifficulty(d)} aria-pressed={difficulty === d}>{t(d)}</button>)}</div></div>
        <MatchOptions value={settings} onChange={setSettings} onValidity={setSettingsValid}/>
        </div><div className="setup-dock"><button className="play-button" disabled={!settingsValid || !validPlayerName(playerName)} onClick={start}>{t('Start Game')}<span aria-hidden="true">→</span></button><button className="text-control" onClick={() => setHelp(true)}>{t('How to play')}</button></div>
      </section> : <section className="solo-battle">
        <BattleShell phase={session.phase} header={<><div className="battle-topline"><button className="battle-icon" aria-label={t('Back')} onClick={() => { timers.current.forEach(clearTimeout); timers.current = []; submitting.current = false; setScreen('setup'); }}>←</button><div className="battle-round"><strong>{t('Game {game} · Round {round}', { game: session.gameNumber, round: currentRound })}</strong><span>{t('First to {target} wins', { target: settings.winsRequired })}</span></div><div className="battle-timer" role="timer" aria-label={t('Move-round time remaining')}>{session.phase === 'choose' ? <strong>{Math.max(0, Math.min(settings.roundSeconds, Math.ceil((session.deadline - now) / 1000)))}{t('s')}</strong> : <strong aria-label={t('Move timer paused')}>—</strong>}</div><BattleMenu onHelp={() => setHelp(true)} onHistory={() => setHistoryOpen(true)} onSettings={openSettings}/></div><div className="battle-scoreline" aria-label={t('Match scoreboard')}><span><strong>{playerName.trim()}</strong><b>{session.progress.scores.player} / {settings.winsRequired}</b></span><span><strong>{'Bot'}</strong><b>{session.progress.scores.ai} / {settings.winsRequired}</b></span></div></>}
        arena={<div className="duel-arena"><article className="battle-fighter"><div className="battle-fighter-heading"><strong>{playerName.trim()}</strong><span>{session.playerAmmo} {t('ammo')}</span></div><div className="battle-character"><ReactionBubble events={activity.events} actorId="player" muted={reactions.muted}/><Character profile={profile} state={characterState(session.phase, latest, 'player')} move={latest?.playerMove} facing="right" reduced={reduced} cycle={session.history.length + '-' + session.phase}/></div><div className="battle-revealed-move">{shown && latest ? revealedMoveLabel(language, latest.playerMove) : session.phase === 'countdown' ? t('Move locked') : ''}</div></article><div className="duel-center">{session.phase === 'countdown' ? <strong className="battle-clap" key={session.count}>{session.count}</strong> : <span>{t('vs')}</span>}</div><article className="battle-fighter opponent"><div className="battle-fighter-heading"><strong>{'Bot'}</strong><span>{session.aiAmmo} {t('ammo')}</span></div><div className="battle-character"><ReactionBubble events={activity.events} actorId="ai" muted={reactions.muted}/><Character profile={session.aiProfile} state={characterState(session.phase, latest, 'ai')} move={latest?.aiMove} facing="left" reduced={reduced} cycle={session.history.length + '-' + session.phase}/></div><div className="battle-revealed-move">{shown && latest ? revealedMoveLabel(language, latest.aiMove) : session.phase === 'countdown' ? t('Move locked') : ''}</div></article>{latest && (session.phase === 'intermission' || session.phase === 'over' && !matchSummaryVisible) && <SoloGameResult round={latest} game={session.gameNumber} name={playerName.trim()} profile={profile} botProfile={session.aiProfile} scores={session.progress.scores}/>}</div>}
        result={<ActivityBar events={activity.events} readyAt={activity.cooldowns.player ?? 0} onReaction={sendSoloReaction} reactionMuted={reactions.muted} onToggleMute={reactions.toggle} status={session.phase === 'countdown' ? session.timedOut ? t('Time expired · Block 1') : t('Clap, clap… reveal!') : announcement?.headline ?? t('Choose your move')} detail={session.phase === 'countdown' ? '' : announcement?.detail}/>}
        controls={<MovePanel ammo={session.playerAmmo} disabled={busy} selected={busy ? session.chosen : undefined} locked={busy} onChoose={submit}/>}/>
        {historyOpen && <BattleSheet title={t('Activity')} onClose={() => setHistoryOpen(false)}><ActivityFeed events={activity.events}/></BattleSheet>}
        {session.phase === 'over' && matchSummaryVisible && latest && <dialog ref={endRef} className="end-card" aria-labelledby="end-title" onCancel={event => { event.preventDefault(); setScreen('home'); }}><button className="settings-gear" aria-label={t('Settings')} onClick={openSettings}><GearIcon/></button><div className="result-avatars"><div className={latest.outcome === 'player' ? 'winner' : ''}><div className="result-character"><ReactionBubble events={activity.events} actorId="player" muted={reactions.muted}/><Character profile={profile} state={characterState(session.phase, latest, 'player')} reduced={reduced}/></div><strong>{playerName.trim()}</strong><small>{t("You")}</small></div><span>{t("vs")}</span><div className={latest.outcome === 'ai' ? 'winner' : ''}><div className="result-character"><ReactionBubble events={activity.events} actorId="ai" muted={reactions.muted}/><Character profile={session.aiProfile} state={characterState(session.phase, latest, 'ai')} facing="left" reduced={reduced}/></div><strong>{avatarById(session.aiProfile.avatarId).name}</strong><small>{t("Rival")}</small></div></div><div className="end-star">{latest.outcome === 'player' ? '✳' : latest.outcome === 'draw' ? '◇' : '↻'}</div><div className="eyebrow">{latest.outcome === 'player' ? t("SCHOOLYARD CHAMPION") : latest.outcome === 'draw' ? t("GREAT MINDS THINK ALIKE") : t("THERE’S ALWAYS A REMATCH")}</div><h2 id="end-title">{latest.outcome === 'player' ? t("You win the match!") : latest.outcome === 'draw' ? t("It’s a draw!") : t("Bot wins the match!")}</h2><p>{t('solo.namedFinalScore', { name: playerName.trim(), target: settings.winsRequired, player: session.progress.scores.player, rival: session.progress.scores.ai })}</p><p className="game-end-announcement"><strong>{announcement?.headline}</strong></p><p>{announcement?.detail}</p><ActivityBar events={activity.events} readyAt={activity.cooldowns.player ?? 0} onReaction={sendSoloReaction} reactionMuted={reactions.muted} onToggleMute={reactions.toggle} status={t("Match complete")}/><div className="end-stats"><span>{t('{count} move rounds', { count: session.history.length })}</span><span>{t("You:")}{session.playerAmmo} {t("ammo")}</span><span>{t("Rival:")}{session.aiAmmo} {t("ammo")}</span></div><button className="play-button" autoFocus onClick={start}>{t("Replay")}<span>↗</span></button><button className="how-button" onClick={() => { setMatchSummaryVisible(false); setScreen('home'); }}>{t("Home")}</button><button className="how-button" onClick={() => { setMatchSummaryVisible(false); setScreen('setup'); }}>{t("Change settings")}</button></dialog>}
      </section>}
    </main>
    {settingsOpen && <SettingsPage onBack={closeSettings} multiplayer={screen === 'multiplayer' && privateBattle} solo={screen === 'game'}/>}
    {help && (screen === 'game' || privateBattle) && <BattleSheet title={t('How to Ching')} onClose={() => setHelp(false)}><p>{t('Ching is a Cambodian schoolyard hand game. Local rules may vary; this version follows the rules supplied for this game.')}</p><p>{t('Both start at 0 គ្រាប់ (ammo). Reload adds one. Keep unused ammo between rounds.')}</p><MoveHelp/>{privateBattle && <><p>{t('Everyone starts at 0 ammo. Reload, block, or attack one active target. Choices and targets stay secret until all active players lock. Attacks cost ammo once, including blocked and canceled attacks. A matching block stops every incoming attack it covers; any uncovered hit eliminates you.')}</p><p>{t('When two players attack each other, the stronger attack wins and equal attacks cancel. Attacking never protects you from a third player. Every legal attack resolves, even if its attacker is eliminated that round. The last survivor wins; everyone eliminated together is a draw. Players eliminated in the same round share a placement.')}</p></>}</BattleSheet>}
    {screen !== 'game' && !privateBattle && <dialog ref={helpRef} className="help-dialog" onCancel={() => setHelp(false)} onClose={() => { setHelp(false); helpButton.current?.focus(); }}><div className="help-header"><div className="eyebrow">{t("A QUICK SCHOOLYARD LESSON")}</div><button className="icon-button" aria-label={t("Close instructions")} onClick={() => setHelp(false)}>×</button></div><h2>{t("How to Ching")}<span>.</span></h2><p>{t("Ching is a Cambodian schoolyard hand game. Local rules may vary; this version follows the rules supplied for this game.")}</p><p>{t("A move round is one action each. A game ends with a winner or draw. A match ends at the selected win target. The timer defaults missing moves to Block 1. Game winners earn 1 point; draws earn none. Between games ammo resets while scores stay.")}</p><ol className="steps"><li><strong>{t("Load up.")}</strong> {t("Both start at 0 គ្រាប់ (ammo). Reload adds one. Keep unused ammo between rounds.")}</li><li><strong>{t("Make a secret choice.")}</strong> {t("Pick a reload, attack, or block. Your rival locks its move before you choose. Clap, then reveal together.")}</li><li><strong>{t("Read your rival.")}</strong> {t("An attack beats a reload or incorrect block. Between attacks, the stronger one wins. One successful attack ends the game.")}</li></ol><div className="help-moves">{MOVE_LIST.map(m => <div key={m.id}><Gesture move={m.id} small/><div><strong>{moveLabel(m.id)} <span>{m.kind === 'attack' ? t('Cost {cost} ammo · power {power}', { cost: m.cost, power: m.strength }) : m.kind === 'reload' ? '+1 គ្រាប់' : 'Free'}</span></strong><p>{t(m.gesture)}</p>{m.kind === 'block' && <small>{t("Stops")}{m.stops.map(id => moveLabel(id)).join(' and ')}.</small>}</div></div>)}</div><p><strong>{t("No attack?")}</strong> {t("Reload/block and block/block rounds continue. All changes use ammo from the start of the round and apply together, even in the final round.")}</p><label className="motion-toggle"><input type="checkbox" checked={reduced} onChange={e => setReduced(e.target.checked)}/>{t("Reduced motion")}</label><fieldset className="rule-settings"><legend>{t("House rules")}</legend><label><input type="checkbox" checked={rules.equalAttacks === 'cancel'} onChange={e => setRules(r => ({ ...r, equalAttacks: e.target.checked ? 'cancel' : 'draw' }))}/> {t("Equal attacks cancel and play continues (off: game ends in a draw)")}</label><label><input type="checkbox" checked={rules.blocksStopWeaker} onChange={e => setRules(r => ({ ...r, blocksStopWeaker: e.target.checked }))}/> {t("Blocks also stop weaker attacks (default: listed attacks only)")}</label><label><input type="checkbox" checked={rules.spendFailedAttacks} onChange={e => setRules(r => ({ ...r, spendFailedAttacks: e.target.checked }))}/> {t("Every attack spends ammo, including blocked or canceled attacks")}</label></fieldset><button className="play-button" onClick={() => setHelp(false)}>{t("Got it")}<span>✓</span></button></dialog>}
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><LanguageProvider><AppPreferencesProvider><App/></AppPreferencesProvider></LanguageProvider></React.StrictMode>);




