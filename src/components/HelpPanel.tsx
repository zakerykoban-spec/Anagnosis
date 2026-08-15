import {
  INSIGHT_HELP_OBSERVATIONS,
  INSIGHT_HELP_TERMS,
  UNSUPPORTED_LXX_HELP_GROUPS,
} from '../helpContent'

export function HelpPanel({ showGloss }: { showGloss: boolean }) {
  return <details className="help-panel">
    <summary>
      <span>Βοήθεια</span>
      {showGloss && <small>Help and grammar guide</small>}
    </summary>
    <div className="help-content">
      <section>
        <h4>Ἀνάγνωσις</h4>
        <ul>
          <li>Choose Progressive or Challenge books under Options. Your choices and reading places are remembered.</li>
          <li>Use Σφράγισον to complete a reading. Plans advance only after completion; daily prayers follow the calendar.</li>
          <li>Open Γραφαί · Ἀνάγνωσις to read any SBLGNT or Septuagint chapter. The lower controls continue across chapter and book boundaries.</li>
        </ul>
      </section>
      <section>
        <h4>Λεξικὴ βοήθεια</h4>
        <p>Tap a Greek word to open any available lexical and grammatical assistance. A faint dotted mark only identifies an uncommon lemma; every assisted word can still be opened.</p>
        <p>English glosses follow the English-aids setting.</p>
      </section>
      <section>
        <h4>Σύνταξις</h4>
        <ol className="help-steps">
          <li>Tap the small verse number to intentionally select a verse.</li>
          <li>Tap <span className="help-control-name">Σύνταξις · Insight</span>.</li>
        </ol>
        <p>Ordinary word taps and navigation do not automatically open or preserve an Insight selection.</p>
        <p>Insight is a deterministic structural reading aid derived from reviewed syntax metadata. It is not an English translation, commentary, theological interpretation, or AI-generated exegesis. The canonical Greek verse remains the text being analyzed.</p>
        <p>English explanatory labels appear only when English aids are enabled.</p>
        <dl className="help-definition-list">
          {INSIGHT_HELP_TERMS.map((term) => <div key={term.greek}>
            <dt>{term.greek}</dt>
            {showGloss && <dd>{term.english}</dd>}
          </div>)}
        </dl>
        <p className="help-subheading">Structural observations</p>
        <dl className="help-definition-list">
          {INSIGHT_HELP_OBSERVATIONS.map((term) => <div key={term.greek}>
            <dt>{term.greek}</dt>
            {showGloss && <dd>{term.english}</dd>}
          </div>)}
        </dl>
      </section>
      <section>
        <h4>Κάλυψις βοηθείας</h4>
        <p>All 27 SBLGNT books support lexical assistance and Insight. Reviewed Septuagint support remains intentionally limited.</p>
        <p>Unsupported books remain fully readable, but do not provide word glosses or Insight:</p>
        <ul className="help-compact-list">
          {UNSUPPORTED_LXX_HELP_GROUPS.map((group) => <li key={group.ids.join(':')}>{group.label}</li>)}
        </ul>
        <p>Their assistance is reserved for later witness-specific research and review; this does not indicate a defect in the books or their canonical Greek text.</p>
      </section>
      <section>
        <h4>Λέξεις γραμματικαί</h4>
        <p>The compact line follows Randall Buth’s Greek-first grammatical terminology. It distinguishes indicative time, ὁ χρόνος, from aspect in other forms, ἡ ὄψις.</p>
        <div className="grammar-guide" role="list">
          <p><strong>πτῶσις</strong><span>ορ ὀρθὴ · γε γενική · δο δοτική · αι αἰτιατική · κλ κλητική</span></p>
          <p><strong>ἀριθμός</strong><span>ε ἑνικός · π πληθυντικός</span></p>
          <p><strong>γένος</strong><span>α ἀρσενικόν · θ θηλυκόν · ο οὐδέτερον</span></p>
          <p><strong>χρόνος</strong><span>ενστ · μελλ · πρττ · αορσ · πρκμ · υπρσ</span></p>
          <p><strong>ὄψις</strong><span>πρτ παρατατική · αορ ἀόριστος · πρκ παρακειμένη · μελλ μέλλουσα</span></p>
          <p><strong>διάθεσις</strong><span>ενερ ἐνεργητική · μεση μέση · παθη παθητική</span></p>
          <p><strong>ἔγκλισις</strong><span>ορστ · υποτ · ευκτ · πρστ · απρμ · μετχ</span></p>
          <p><strong>πρόσωπον</strong><span>1ε, 2ε, 3ε · 1π, 2π, 3π</span></p>
        </div>
        <p>Examples: <code>αι α ε</code> marks accusative, masculine, singular; <code>3ε, αορσ ενερ ορστ</code> marks a third-person singular aorist indicative; <code>ορ α ε, πρτ ενερ μετχ</code> marks a nominative masculine singular continuative participle.</p>
        <p>No “deponent” category is shown. STEP’s formal middle/passive analysis is preserved without treating a middle form as a disguised active.</p>
      </section>
    </div>
  </details>
}
