import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GlassCard from '../GlassCard';
import { getFunToolData, saveFunToolData } from '../../services/api';

const RITUAL_KEY = 'mv_ritual_local';

const MOODS = [
  { id: 'doubtful', label: '😟 Doubtful' },
  { id: 'anxious', label: '😰 Anxious' },
  { id: 'excited', label: '🔥 Excited' },
  { id: 'blocked', label: '🧱 Blocked' },
  { id: 'low', label: '😔 Low energy' },
  { id: 'grateful', label: '🙏 Grateful' },
  { id: 'impatient', label: '⏳ Impatient' },
  { id: 'aligned', label: '✨ Aligned' },
];
const AREAS = [
  { id: 'money', label: '💰 Money' },
  { id: 'love', label: '💗 Love' },
  { id: 'career', label: '🚀 Career' },
  { id: 'health', label: '🌿 Health' },
  { id: 'confidence', label: '👑 Confidence' },
  { id: 'general', label: '✦ General' },
];

const RITUALS = {
  doubtful: {
    money: [{ ic: '🌬️', t: 'Box Breathing', d: "4 counts in, hold 4, out 4, hold 4. Your nervous system can't doubt while it's regulated.", time: '2 min' }, { ic: '✍️', t: 'Evidence Journal', d: 'Write 5 times money has shown up for you — any amount. Your brain needs proof before it believes.', time: '3 min' }, { ic: '🗣️', t: 'Speak It', d: 'Say out loud: "I am a magnet for money. It flows to me easily and often." Say it 10 times. Mean it.', time: '1 min' }],
    love: [{ ic: '🌬️', t: 'Heart Breath', d: 'Breathe in through your heart. Breathe out any walls you\'ve built. You are safe to receive love.', time: '2 min' }, { ic: '✍️', t: 'Self-Worth Write', d: 'Write: "I am worthy of love because..." Fill the page. Don\'t stop.', time: '5 min' }, { ic: '🪞', t: 'Mirror Work', d: 'Look in your eyes. Say: "I love you. I choose you. Love is safe for me." Repeat until you mean it.', time: '2 min' }],
    career: [{ ic: '🌬️', t: 'Grounding Breath', d: '5 deep breaths. Feel your feet on the floor. You are stable. You are capable.', time: '1 min' }, { ic: '✍️', t: 'Win List', d: "Write 10 wins from your career — big or small. You've always found a way.", time: '4 min' }, { ic: '💫', t: 'Future Flash', d: "Close your eyes. See your future self at work in their dream role. Feel their confidence. It's you.", time: '3 min' }],
    health: [{ ic: '🌬️', t: 'Body Love Breath', d: 'Breathe into your body with gratitude. Your heart beats without you asking. That is miracle.', time: '2 min' }, { ic: '✍️', t: 'Gratitude Body Scan', d: 'Write 5 things your body does perfectly every single day. Thank each one.', time: '3 min' }, { ic: '💫', t: 'Healthy Vision', d: 'Close your eyes. See yourself full of energy, glowing, strong. Your body responds to what you believe.', time: '3 min' }],
    confidence: [{ ic: '🌬️', t: 'Power Breath', d: 'Inhale confidence. Exhale doubt. Do this 7 times, making the exhale longer each time.', time: '2 min' }, { ic: '✍️', t: 'I Am List', d: 'Write 10 "I am" statements about your most confident self. Write them as if they are already true.', time: '3 min' }, { ic: '🪞', t: 'Power Pose Mirror', d: 'Stand in a power pose before the mirror for 2 minutes. Your body changes your mind.', time: '2 min' }],
    general: [{ ic: '🌬️', t: 'Centering Breath', d: 'Close your eyes. Breathe deep. You are where you need to be. Everything is working out for you.', time: '2 min' }, { ic: '✍️', t: 'Gratitude List', d: "Write 10 things you're grateful for right now. Even the small things. Especially the small things.", time: '4 min' }, { ic: '💫', t: 'Feel It Moment', d: 'Hold one desire in mind. Feel the emotion of having it. Stay there for 90 seconds. Your subconscious records this.', time: '2 min' }],
  },
  anxious: {
    money: [{ ic: '🌬️', t: '4-7-8 Breath', d: 'In 4, hold 7, out 8. This activates your parasympathetic system. Do 4 rounds.', time: '3 min' }, { ic: '🫀', t: 'Body Scan', d: 'Where is money anxiety stored in your body? Put your hand there. Breathe into it. Release.', time: '3 min' }, { ic: '✍️', t: 'Trust Statement', d: 'Write: "Money is always coming to me. I trust the flow. I am provided for." Write it 10 times.', time: '2 min' }],
    love: [{ ic: '🌬️', t: 'Slow Exhale', d: 'Your exhale is twice as long as your inhale. This signals safety to your nervous system.', time: '3 min' }, { ic: '🫀', t: 'Heart Scan', d: 'Put your hand on your heart. Feel its rhythm. You are safe. You are loved by life itself.', time: '2 min' }, { ic: '✍️', t: 'Release Writing', d: "Write what you're afraid of, then cross it out and write the opposite — what you choose to believe instead.", time: '4 min' }],
    career: [{ ic: '🌬️', t: 'Grounding 5-4-3-2-1', d: "Name 5 things you see, 4 you hear, 3 you feel, 2 you smell, 1 you taste. Now you're here.", time: '2 min' }, { ic: '🫀', t: 'Shoulder Drop', d: "Consciously drop your shoulders from your ears. Unclench your jaw. Soften your belly. You don't have to brace.", time: '1 min' }, { ic: '✍️', t: "It's Already Done", d: 'Write: "My career is unfolding perfectly. The right opportunities find me. I am guided." 10 times.', time: '2 min' }],
    health: [{ ic: '🌬️', t: 'Belly Breath', d: "Breathe so your belly rises, not your chest. This is your body's rest signal. 8 slow rounds.", time: '3 min' }, { ic: '🫀', t: 'Body Reassurance', d: 'Put your hands on your body and say: "You are healing. You are strong. I trust you."', time: '2 min' }, { ic: '💫', t: 'Healthy Future Self', d: 'Visualise waking up feeling perfect — energised, pain-free, vibrant. Hold that image for 90 seconds.', time: '2 min' }],
    confidence: [{ ic: '🌬️', t: "Lion's Breath", d: 'Inhale through nose. Open mouth wide, stick out tongue, exhale forcefully. Releases tension. Do 5x.', time: '2 min' }, { ic: '🫀', t: 'Shake It Off', d: 'Stand up and shake your entire body for 30 seconds. Animals release stress this way — so can you.', time: '1 min' }, { ic: '✍️', t: 'Courage Affirmation', d: 'Write: "I am brave enough to try. My presence is enough. I belong in every room I enter." 10 times.', time: '2 min' }],
    general: [{ ic: '🌬️', t: 'Triangle Breath', d: 'In 4, hold 4, out 4. A triangle of calm. Do 6 rounds and watch anxiety dissolve.', time: '3 min' }, { ic: '🫀', t: 'Ground Yourself', d: 'Feel your feet on the floor. Press them down. You are here. You are held by the earth.', time: '1 min' }, { ic: '✍️', t: 'Safe Statement', d: 'Write: "I am safe right now. Things are working out. I can trust the process." Write until you feel it.', time: '3 min' }],
  },
  excited: {
    money: [{ ic: '✦', t: 'Amplify It', d: "Your excitement is a frequency. Don't dampen it — amplify it. Let yourself feel wealthy right now.", time: '2 min' }, { ic: '✍️', t: 'Receive Script', d: 'Write a page about receiving your desire — what you do, how you feel, who you call. Make it vivid.', time: '5 min' }, { ic: '🎯', t: 'Action Step', d: 'Identify ONE inspired action you can take today. Excitement without action is wasted energy.', time: '2 min' }],
    love: [{ ic: '💗', t: 'Open Heart Practice', d: 'Press your hand to your heart. Feel gratitude for the love already in your life. Expand it.', time: '2 min' }, { ic: '✍️', t: 'Love Letter', d: "Write a love letter from your desired relationship — as if you're already in it, writing to a friend.", time: '5 min' }, { ic: '🎯', t: 'Aligned Action', d: 'What one thing would your in-love self do today? Do it.', time: '2 min' }],
    career: [{ ic: '🚀', t: 'Vision Lock In', d: "Close your eyes. Your career dream is happening. Lock it in like you're saving a file. It's done.", time: '3 min' }, { ic: '✍️', t: 'Success Story', d: 'Write your future success story in past tense as if it already happened. Use real details.', time: '6 min' }, { ic: '🎯', t: 'Next Step', d: 'Energy without direction scatters. What is one concrete step towards your goal today?', time: '1 min' }],
    health: [{ ic: '🌿', t: 'Celebrate Your Body', d: 'Do something kind for your body right now — stretch, dance, breathe deeply. This is your temple.', time: '3 min' }, { ic: '✍️', t: 'Health Vision Script', d: 'Script your ideal day in your ideal healthy body. What do you eat? How do you move? How do you feel?', time: '5 min' }, { ic: '🎯', t: 'Health Action', d: "Make one healthy choice right now that your future self will thank you for.", time: '1 min' }],
    confidence: [{ ic: '👑', t: 'Crown Visualisation', d: 'Imagine a golden crown above your head. Feel your posture shift. You are royalty in your own story.', time: '2 min' }, { ic: '✍️', t: 'Future Self Letter', d: 'Write a letter from your most confident self to you now. What do they want you to know?', time: '5 min' }, { ic: '🎯', t: 'Bold Action', d: "Do the one thing you've been putting off. Confidence is built in action, not waiting.", time: '3 min' }],
    general: [{ ic: '✨', t: 'Gratitude Rush', d: "Write 20 things you're grateful for in 3 minutes. Speed write. Let the energy flow.", time: '3 min' }, { ic: '💫', t: 'Peak State Visualise', d: "From this excited state, lock in your biggest desire. Feel it, see it, know it's yours.", time: '4 min' }, { ic: '🎯', t: 'Act From This Energy', d: 'Do the one aligned action that your highest self is calling you towards right now.', time: '2 min' }],
  },
  blocked: {
    money: [{ ic: '🍃', t: 'Release the Block', d: 'Write: "I release all beliefs that money is hard, scarce, or not for me." Then rip the paper or delete it.', time: '3 min' }, { ic: '🌬️', t: 'Exhale Resistance', d: 'Each exhale releases a money block. 10 long slow exhales. Feel lighter each time.', time: '2 min' }, { ic: '✍️', t: 'New Story', d: 'Write: "In my new story, money..." Finish the sentence 10 different ways. Give yourself permission to dream.', time: '4 min' }],
    love: [{ ic: '🍃', t: 'Let Go Write', d: "Write what you're holding onto — an expectation, a person, an outcome. Then write: \"I release this.\"", time: '4 min' }, { ic: '🌬️', t: 'Open Exhale', d: 'Imagine your heart opening like a flower on each exhale. Release the walls. Love needs space to enter.', time: '3 min' }, { ic: '✍️', t: 'I Am Loveable', d: 'Write: "I am loveable because..." 10 reasons. Even if you don\'t believe it yet. Especially then.', time: '3 min' }],
    career: [{ ic: '🍃', t: 'Fear Release', d: 'Write your biggest career fear. Look at it. Is it true? Is it certain? Write the opposite possibility.', time: '4 min' }, { ic: '🌬️', t: 'Clear Space Breath', d: 'Breathe in possibility. Breathe out "I can\'t." Do this 10 times with full intention.', time: '2 min' }, { ic: '✍️', t: 'Permission Slip', d: 'Write yourself a permission slip to succeed. "I give myself full permission to..." Sign it.', time: '2 min' }],
    health: [{ ic: '🍃', t: 'Forgive Your Body', d: "Write a forgiveness letter to your body for any frustration you've felt with it. Then write its reply.", time: '5 min' }, { ic: '🌬️', t: 'Healing Breath', d: 'Breathe into the part of your body that feels blocked. Imagine golden light dissolving any tension.', time: '3 min' }, { ic: '💫', t: 'Health Affirmation', d: 'Repeat: "Every cell in my body is healing. My body knows how to thrive. I am getting better every day."', time: '2 min' }],
    confidence: [{ ic: '🍃', t: 'Inner Critic Release', d: 'Write what your inner critic says. Now write what a loving mentor says in response to each point.', time: '5 min' }, { ic: '🌬️', t: 'Reset Breath', d: 'Power exhale through the mouth. Do this 5 times. Literally blow out the old story.', time: '1 min' }, { ic: '🪞', t: 'Compassion Mirror', d: 'Look at yourself in the mirror with pure compassion. No judgment. Just: "I see you. I\'m proud of you."', time: '2 min' }],
    general: [{ ic: '🍃', t: 'Unblock Write', d: "Write stream-of-consciousness for 5 minutes without stopping. Don't think. Just write. Let it move.", time: '5 min' }, { ic: '🌬️', t: 'Clearing Exhale', d: 'Imagine a blocked drain opening. Each exhale clears more. Feel space opening inside you.', time: '3 min' }, { ic: '✨', t: 'One Small Yes', d: 'What is one tiny thing you can say yes to today? Unblocking starts with one small move forward.', time: '2 min' }],
  },
  low: {
    money: [{ ic: '☀️', t: 'Abundance Hunt', d: 'For 3 minutes, find as many signs of abundance around you as possible. Warmth, food, shelter, colour.', time: '3 min' }, { ic: '✍️', t: 'Money Moments', d: 'Write 3 times today\'s date, money was actually fine. Even just "I bought coffee." Abundance is here.', time: '3 min' }, { ic: '💫', t: 'Future Pull', d: 'From low energy, let your future wealthy self pull you. Imagine them reaching back: "Come on. It\'s good up here."', time: '3 min' }],
    love: [{ ic: '💗', t: 'Self Love First', d: 'Low energy is a signal to come home to yourself. Do one loving thing for yourself in the next 5 minutes.', time: '5 min' }, { ic: '✍️', t: 'Love Already Here', d: 'Write 5 ways you are already loved — by anyone, anything, any force. Love is always present.', time: '3 min' }, { ic: '🌬️', t: 'Heart Warmth Breath', d: 'Breathe into your heart. Imagine warmth spreading from there. You are held.', time: '2 min' }],
    career: [{ ic: '☀️', t: 'One Thing', d: 'Low energy + big goals = overwhelm. Pick one tiny thing. Just one. Do that.', time: '2 min' }, { ic: '✍️', t: 'Why Write', d: 'Write: "I want this career dream because..." Write until you feel the spark again. The why restores energy.', time: '4 min' }, { ic: '💫', t: 'Remember the Vision', d: 'Close your eyes. Return to the version of your vision that excited you most. Revisit the feeling.', time: '3 min' }],
    health: [{ ic: '🌿', t: 'Move Gently', d: 'Stand up. Roll your neck, roll your shoulders, sway gently. Your body wants to move — even softly.', time: '3 min' }, { ic: '🌬️', t: 'Energising Breath', d: 'Short sharp inhales through nose, long slow exhale. Do 10 rounds. This activates your energy centres.', time: '3 min' }, { ic: '✍️', t: 'Body Gratitude', d: 'Write: "Thank you body for..." 5 things. When you appreciate what works, more works.', time: '3 min' }],
    confidence: [{ ic: '☀️', t: 'Evidence Gather', d: "Write 3 things you've done that actually took courage. You're braver than you remember right now.", time: '3 min' }, { ic: '🌬️', t: 'Energise Breath', d: 'Breathe fast and full for 30 seconds. Shake your hands. Jump once. Change your state physically first.', time: '2 min' }, { ic: '🪞', t: 'Soft Mirror', d: 'Look at yourself without expectation. Say: "You\'re doing better than you think." Mean it.', time: '1 min' }],
    general: [{ ic: '🌿', t: 'Rest Is Aligned', d: 'Sometimes low energy means you need rest, not more effort. Give yourself permission to go slowly today.', time: '— min' }, { ic: '✍️', t: 'Micro-Gratitude', d: "Write 10 tiny things you're grateful for. The smaller the better. Warmth of bed. Morning light.", time: '3 min' }, { ic: '💫', t: 'Low-Energy Affirm', d: 'Affirm quietly, not loudly: "Things are shifting. I\'m guided. Even now, I\'m moving forward."', time: '2 min' }],
  },
  grateful: {
    money: [{ ic: '💰', t: 'Receive Mode', d: 'Gratitude opens the channel. You are already in the highest vibration for money. Write 5 ways money could come to you unexpectedly.', time: '3 min' }, { ic: '✍️', t: 'Abundance Script', d: "From this grateful state, script your next level. You're writing from the feeling of already having it.", time: '6 min' }, { ic: '✨', t: 'Amplify & Send', d: 'Sit quietly. Feel gratitude for all the money coming. Say: "Thank you. More of this, please."', time: '2 min' }],
    love: [{ ic: '💗', t: 'Love Flood', d: 'Let gratitude for the love in your life flood your heart. Every person who has ever loved you. Feel it all.', time: '3 min' }, { ic: '✍️', t: "Love That's Coming", d: "Write a thank-you letter for the love that's on its way. Like it's already arrived.", time: '4 min' }, { ic: '✨', t: 'Send Love Out', d: 'Close your eyes. Send love to someone specific. Feel it leave your heart and reach them.', time: '2 min' }],
    career: [{ ic: '🚀', t: 'Gratitude Momentum', d: 'Grateful energy is the highest momentum fuel. What progress can you celebrate — no matter how small?', time: '2 min' }, { ic: '✍️', t: 'Gratitude Growth', d: 'Write: "I\'m grateful for how far I\'ve come because..." Detail the journey. This is your fuel.', time: '4 min' }, { ic: '✨', t: 'Future Thanks', d: "Say thank you for the career success that's coming as if it's already arrived.", time: '2 min' }],
    health: [{ ic: '🌿', t: 'Body Appreciation', d: 'Your body is miraculous. Touch your hands, your face. Feel gratitude for this vessel that carries your life.', time: '3 min' }, { ic: '✍️', t: 'Vitality Script', d: 'Write what your perfectly healthy body feels like. Go into every detail. Feeling is healing.', time: '5 min' }, { ic: '✨', t: 'Healing Gratitude', d: 'Say: "Thank you body for healing. Every cell is grateful for life. I am vibrant."', time: '2 min' }],
    confidence: [{ ic: '👑', t: 'Own Your Power', d: 'You are allowed to feel this good about yourself. Gratitude for your own qualities is not arrogance. It is truth.', time: '2 min' }, { ic: '✍️', t: 'Strength Inventory', d: 'Write 10 strengths you genuinely have. Include personality, resilience, skills, energy. Own them.', time: '4 min' }, { ic: '✨', t: 'Gratitude Identity', d: 'Say: "I am grateful to be me. I am grateful for my path. I am grateful for who I\'m becoming."', time: '1 min' }],
    general: [{ ic: '✨', t: 'Gratitude Flood', d: 'Let gratitude for your entire life wash over you. For where you live, what you eat, who loves you, your breath.', time: '3 min' }, { ic: '✍️', t: 'Desire x Gratitude', d: 'Write each desire with: "Thank you for bringing me..." — as if thanking the universe in advance.', time: '5 min' }, { ic: '💫', t: 'Lock in the Frequency', d: 'You are at peak manifestation frequency. Sit quietly. Feel your desires as done. Hold this for 2 minutes.', time: '2 min' }],
  },
  impatient: {
    money: [{ ic: '⏳', t: 'Trust the Timing', d: 'Write: "The money is on its way. The universe\'s timing is perfect. It arrives at exactly the right moment."', time: '2 min' }, { ic: '🌬️', t: 'Patience Breath', d: 'Each long exhale releases urgency. Urgency repels. Peace attracts. 8 slow long exhales.', time: '3 min' }, { ic: '✍️', t: 'Already Working', d: "Write 3 ways your desire is already in motion, even if you can't see it yet. Trust the unseen.", time: '3 min' }],
    love: [{ ic: '⏳', t: 'Release the When', d: 'Write: "I detach from the timeline. I trust love is finding its way to me. I stop pushing."', time: '2 min' }, { ic: '🌬️', t: 'Surrender Breath', d: 'On each exhale, surrender the outcome. You can want it fully AND release control. Both are true.', time: '3 min' }, { ic: '💗', t: 'Love Yourself Now', d: 'The energy you want from a partner — give it to yourself first. Right now, this minute.', time: '3 min' }],
    career: [{ ic: '⏳', t: 'Seeds Need Time', d: "Write about a seed. It doesn't panic underground. It grows in darkness first. Your career is growing.", time: '3 min' }, { ic: '🌬️', t: 'Slow Down Breath', d: 'Paradox: the faster you want something, the slower you need to breathe. 5 extra-slow rounds.', time: '3 min' }, { ic: '✍️', t: 'Process Gratitude', d: 'Write 5 ways the journey itself is shaping you. The wait is making you ready.', time: '4 min' }],
    health: [{ ic: '⏳', t: 'Healing Timeline', d: 'Write: "My body heals at exactly the right pace. I support it and trust it. I am patient with myself."', time: '2 min' }, { ic: '🌬️', t: 'Healing Breath', d: 'Slow healing breath: in 5, hold 5, out 7. Longer exhale = more healing parasympathetic response.', time: '4 min' }, { ic: '🌿', t: 'Celebrate Progress', d: 'List 3 ways your health is better than it was 6 months ago. Any improvement counts.', time: '3 min' }],
    confidence: [{ ic: '⏳', t: 'Growth Takes Time', d: "Write about someone you admire. They were not born confident. Confidence is built. You're building.", time: '3 min' }, { ic: '🌬️', t: 'Acceptance Breath', d: 'Breathe in "I am enough right now." Breathe out "I am also growing." Both. Simultaneously.', time: '3 min' }, { ic: '✍️', t: 'Already Enough', d: 'Write 10 reasons you are already enough exactly as you are, while also growing.', time: '4 min' }],
    general: [{ ic: '⏳', t: 'Trust Process Write', d: 'Write: "I trust that everything I want is moving towards me right now. I don\'t need to force it."', time: '3 min' }, { ic: '🌬️', t: 'Detachment Breath', d: 'Each exhale, imagine releasing your grip on the outcome. Not giving up — trusting.', time: '3 min' }, { ic: '✍️', t: 'Signs Inventory', d: 'Write 3 signs that your desire is coming. Even small ones. The universe is always communicating.', time: '3 min' }],
  },
  aligned: {
    money: [{ ic: '✦', t: 'Receive Fully', d: 'You\'re aligned. Now let yourself actually receive. Write: "I allow myself to have all the money I desire."', time: '2 min' }, { ic: '✍️', t: 'Wealth Script', d: 'From this aligned state, write your most vivid wealth script yet. No limits. Go wild.', time: '7 min' }, { ic: '🎯', t: 'Inspired Action', d: "What is one bold money action you've been holding back on? Now is the time.", time: '5 min' }],
    love: [{ ic: '✦', t: 'Open Fully', d: 'You are aligned. Open your heart completely. Say: "I am ready. I allow love in. I am available."', time: '2 min' }, { ic: '✍️', t: 'Relationship Script', d: 'Write the most detailed, joyful relationship script you can imagine. You deserve every word of it.', time: '7 min' }, { ic: '💗', t: 'Give Love Out', d: 'Send love to everyone in your life. From overflow. This is how abundance multiplies.', time: '3 min' }],
    career: [{ ic: '✦', t: 'Peak State Lock', d: "You're aligned. Lock this state into your body. Remember how this feels — return here every morning.", time: '2 min' }, { ic: '✍️', t: 'Dream Career Script', d: 'Write exactly the career you want in as much detail as possible. Name, location, team, impact.', time: '7 min' }, { ic: '🎯', t: 'Big Move', d: "From alignment, take the bold career action you've been considering. Alignment is your signal to move.", time: '5 min' }],
    health: [{ ic: '✦', t: 'Health Gratitude', d: 'In this aligned state, pour gratitude into your body. Every system, every cell. You are deeply grateful.', time: '3 min' }, { ic: '✍️', t: 'Perfect Health Script', d: 'Write your ideal health in exquisite detail. Morning energy, physical strength, mental clarity.', time: '6 min' }, { ic: '🌿', t: 'Aligned Health Action', d: 'Do one perfect health action from this state — the food, the movement, the sleep. Let alignment guide it.', time: '5 min' }],
    confidence: [{ ic: '✦', t: 'Own This', d: 'This is who you are. Aligned, powerful, magnetic. Say: "This is me. This is my natural state."', time: '2 min' }, { ic: '✍️', t: 'Confident Future Self', d: 'Write as your most confident future self. Who are you? What do you say? How do you carry yourself?', time: '6 min' }, { ic: '👑', t: 'Act From Here', d: 'Do the bold thing that aligned-confident-you would do today. Not later. Now.', time: '5 min' }],
    general: [{ ic: '✦', t: 'Amplify This', d: "You are aligned. Feel it fully. Don't ration it. Let yourself feel completely good about your life.", time: '3 min' }, { ic: '✍️', t: 'Receive Script', d: 'Write 3 paragraphs beginning with "I receive..." Allow yourself to write desires you\'ve been shy about.', time: '6 min' }, { ic: '🎯', t: 'Aligned Bold Action', d: 'Alignment is the signal. Take one significant action towards your most important desire today.', time: '5 min' }],
  },
};

export default function RitualBuilderTool() {
  const [mood, setMood] = useState(null);
  const [area, setArea] = useState(null);

  useEffect(() => {
    (async () => {
      let state = null;
      try {
        const local = await AsyncStorage.getItem(RITUAL_KEY);
        if (local) state = JSON.parse(local);
      } catch (e) {}
      try {
        const remote = await getFunToolData('fun_ritual');
        if (remote) state = remote;
      } catch (e) {}
      if (state) {
        if (state.mood !== undefined) setMood(state.mood);
        if (state.area !== undefined) setArea(state.area);
      }
    })();
  }, []);

  const persist = useCallback(async (nextMood, nextArea) => {
    const state = { mood: nextMood, area: nextArea };
    try { await AsyncStorage.setItem(RITUAL_KEY, JSON.stringify(state)); } catch (e) {}
    try { await saveFunToolData('fun_ritual', state); } catch (e) {}
  }, []);

  const handleMood = (id) => { setMood(id); persist(id, area); };
  const handleArea = (id) => { setArea(id); persist(mood, id); };

  const steps = mood && area ? (RITUALS[mood]?.[area] || RITUALS[mood]?.general || []) : null;
  const totalMins = steps ? steps.reduce((s, st) => s + (parseInt(st.time, 10) || 0), 0) : 0;
  const moodLabel = MOODS.find((m) => m.id === mood)?.label || '';
  const areaLabel = AREAS.find((a) => a.id === area)?.label || '';

  return (
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 50, paddingBottom: 40 }}>
        <Text style={styles.title}>Desire Ritual <Text style={styles.titleAccent}>Builder</Text></Text>
        <Text style={styles.subtitle}>Choose your mood and focus area — receive a custom ritual.</Text>

        <Text style={styles.stepLbl}>How are you feeling right now?</Text>
        <View style={styles.chipsRow}>
          {MOODS.map((m) => (
            <TouchableOpacity key={m.id} style={[styles.chip, mood === m.id && styles.chipOn]} onPress={() => handleMood(m.id)}>
              <Text style={[styles.chipText, mood === m.id && styles.chipTextOn]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.stepLbl}>What area are you focusing on?</Text>
        <View style={styles.chipsRow}>
          {AREAS.map((a) => (
            <TouchableOpacity key={a.id} style={[styles.chip, area === a.id && styles.chipOn]} onPress={() => handleArea(a.id)}>
              <Text style={[styles.chipText, area === a.id && styles.chipTextOn]}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {steps && (
          <GlassCard style={{ marginTop: 8 }}>
            <Text style={styles.resultHd}>Your Ritual 🕯️</Text>
            <Text style={styles.resultSub}>{moodLabel} · {areaLabel} · ~{totalMins} minutes total</Text>
            {steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>{step.ic} {step.t}</Text>
                  <Text style={styles.stepDesc}>{step.d}</Text>
                  <Text style={styles.stepTime}>{step.time}</Text>
                </View>
              </View>
            ))}
          </GlassCard>
        )}
      </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, color: '#2e2530', fontWeight: '600' },
  titleAccent: { fontStyle: 'italic', color: '#9a5fa8', fontWeight: '400' },
  subtitle: { fontSize: 13, color: '#6b5c66', marginTop: 4, marginBottom: 18, fontWeight: '500' },

  stepLbl: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', color: '#9a5fa8', marginBottom: 10 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  chip: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(201,168,201,0.4)', backgroundColor: 'rgba(255,255,255,0.7)' },
  chipOn: { backgroundColor: '#c9a8c9', borderColor: 'transparent' },
  chipText: { fontSize: 12.5, fontWeight: '500', color: '#6b5c66' },
  chipTextOn: { color: '#fff' },

  resultHd: { fontSize: 18, fontWeight: '500', color: '#2e2530', marginBottom: 2 },
  resultSub: { fontSize: 12, color: '#9a5fa8', fontWeight: '600', marginBottom: 16 },
  stepRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(201,168,201,0.2)', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  stepNumText: { fontSize: 12, fontWeight: '700', color: '#9a5fa8' },
  stepTitle: { fontSize: 14, fontWeight: '600', color: '#2e2530', marginBottom: 4 },
  stepDesc: { fontSize: 13, color: '#6b5c66', lineHeight: 19 },
  stepTime: { fontSize: 11, color: '#9a5fa8', fontWeight: '600', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
});