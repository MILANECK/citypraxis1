import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaUsageStatus} from '../public/media-usage.js';

test('media badges distinguish published, draft-only, and unused files by exact path',()=>{
  const live='/uploads/live.webp',draft='/uploads/draft.mp4';
  const published={pages:[{image:live,sections:[{poster:'/uploads/other.jpg'}]}]};
  const edits={pages:[{image:draft,sections:[{poster:'/uploads/other.jpg'}]}]};
  assert.equal(mediaUsageStatus(live,published,edits),'live');
  assert.equal(mediaUsageStatus(draft,published,edits),'draft');
  assert.equal(mediaUsageStatus('/uploads/live.webp.bak',published,edits),'unused');
  assert.equal(mediaUsageStatus('/uploads/not-used.webp',published,edits),'unused');
});
