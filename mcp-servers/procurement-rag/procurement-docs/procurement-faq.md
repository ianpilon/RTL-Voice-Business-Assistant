# Procurement Frequently Asked Questions (FAQ)

## Submitting Procurement Requests

### Q: How do I submit a procurement request?
**A**: Submit via JIRA ticket in the "Procurement Requests" project. Your request must include:
- Budget number
- Project description
- Milestones and timeline
- Cost estimate or quote
- Business justification

**Incomplete requests will be returned** to avoid procurement team time waste.

---

### Q: What information is required for a complete request?
**A**: Required fields for all requests:
1. **Budget Number**: Your department's budget code
2. **Milestones**: Key project phases or deliverables
3. **Cost Breakdown**: Itemized costs or vendor quote
4. **Description**: What you're buying and why
5. **Timeline/Deadline**: When you need this by
6. **Vendor Information**: If you have a preferred vendor

**Missing any of these? Your request will be sent back.**

---

### Q: How long does procurement take?
**A**: Timeline depends on contract value and complexity:

| Contract Value | Standard Timeline | Expedited (if justified) |
|----------------|-------------------|--------------------------|
| Under $25K | 5-7 business days | 3-5 days |
| $25K-$50K | 7-10 business days | 5-7 days |
| $50K-$100K | 10-15 business days | 7-10 days |
| Over $100K | 15-20 business days | 10-15 days |

**Add 5-10 days** if legal review required or vendor is not yet onboarded.

---

### Q: Can I use a vendor that's not on the approved list?
**A**: Yes, but they must complete onboarding first (see vendor onboarding process). This adds 5-20 days depending on risk level. 

**Tip**: Check with procurement early if you're considering a new vendor.

---

### Q: What if my request is urgent?
**A**: Mark as "Urgent" in JIRA and email Andrea Smith directly. Include:
- Business justification for urgency
- Consequences of delay
- Requested timeline
- Confirmation all required info is included

**Note**: Urgency doesn't waive required approvals, but can expedite processing.

---

## Vendors and Contracts

### Q: How do I know which contract template to use?
**A**: Common scenarios:
- **Defined project with clear deliverables** → Fixed Price Services Agreement
- **Ongoing work or evolving scope** → Time and Materials Agreement  
- **Multiple projects with same vendor** → Master Services Agreement (MSA) + SOWs
- **Software subscription** → Software License Agreement
- **Individual freelancer** → Independent Contractor Agreement
- **Sharing confidential info before deciding** → NDA first

**Not sure?** Contact procurement team or reference the Contract Templates Guide.

---

### Q: Can a vendor use their own contract?
**A**: Yes, but:
- Requires full legal review (adds 10-15 days)
- Common with large SaaS vendors (Salesforce, Microsoft, etc.)
- Often results in vendor paper + IOG addendum
- Must still meet IOG minimum requirements

**Budget extra time** for negotiation if vendor insists on their paper.

---

### Q: How do I find vendors with specific skills?
**A**: Three options:
1. **Search approved vendor database**: Contact James Chen or check internal database
2. **Ask procurement for recommendations**: Email procurement@iog.com with your needs
3. **Bring your own vendor**: They must complete onboarding first

**Example**: "I need vendors with Rust engineering experience" → Procurement can provide list of pre-approved vendors with that skillset.

---

### Q: What's the difference between Fixed Price and Time & Materials?
**A**:

**Fixed Price (FP)**:
- Total cost agreed upfront
- Scope must be well-defined
- Payment tied to milestones
- Better for defined projects
- **Example**: Build a website for $50K

**Time & Materials (T&M)**:
- Pay for actual time/resources used
- Flexible scope
- Monthly invoicing
- Not-To-Exceed (NTE) cap required
- **Example**: DevOps support at $150/hour, NTE $50K

**Choose FP** when scope is clear. **Choose T&M** when scope may evolve.

---

### Q: Who approves contracts at different dollar amounts?
**A**:

| Amount | Approver | Legal Review | Additional |
|--------|----------|--------------|------------|
| <$25K | Procurement Specialist | Not required | - |
| $25K-$50K | Procurement Manager | Recommended | - |
| $50K-$100K | Procurement Manager | Recommended | CFO notification |
| $100K-$250K | CFO | Required | - |
| >$250K | CFO | Required | Board notification |

---

## Budget and Payments

### Q: What are the payment terms?
**A**: Standard terms are **Net 30** (payment within 30 days of invoice).

**Fixed Price contracts**: Milestone-based payments
- Max 20% upfront
- Remaining spread across milestones
- 30-50% balloon payment at end (typical)

**Time & Materials contracts**: Monthly invoicing with NTE cap

---

### Q: Can I pay more than 20% upfront on a fixed price contract?
**A**: Only with CFO written approval. Requirements:
- Strong business justification
- Vendor financial stability verified
- Typically only for established, trusted vendors

**Most requests for >20% upfront are denied** to protect IOG.

---

### Q: What's a balloon payment?
**A**: A larger final payment upon project completion (typically 30-50% of contract value).

**Benefits**:
- Incentivizes vendor to finish
- Protects IOG investment
- Standard industry practice

**Example**: On a $100K contract, final payment of $40K upon acceptance is a balloon payment.

---

### Q: What if the project costs more than expected?
**A**: For Fixed Price: Requires change order and additional approval

For Time & Materials: 
- Vendor must notify when 75% of NTE reached
- IOG decides: approve increase, reduce scope, or stop
- Written approval required to exceed NTE

**Prevention**: Build 10-15% buffer into T&M estimates.

---

### Q: How do I get a Purchase Order (PO) number?
**A**: Issued automatically by procurement once contract is approved. 

**Vendor needs the PO number** for all invoices. Procurement will provide it to you and the vendor after approval.

---

## Approval and Processing

### Q: Why was my request returned?
**A**: Common reasons:
- ❌ Missing budget number
- ❌ No milestones specified
- ❌ Cost breakdown not provided
- ❌ Business justification unclear
- ❌ Deadline not specified
- ❌ Vendor not yet onboarded

**Fix these issues and resubmit** for faster processing.

---

### Q: Can I start work before the contract is signed?
**A**: **Generally no**, for risk and compliance reasons.

**Exceptions**:
- Emergency situations with Andrea's approval
- Can execute Limited Services Agreement (LSA) while contract is finalized
- Vendor must acknowledge IOG not liable for pre-contract work

**Best practice**: Engage procurement early to avoid delays.

---

### Q: How do I expedite approval?
**A**:
1. Submit complete request (all fields filled)
2. Mark as "Urgent" in JIRA
3. Email Andrea Smith with justification
4. Use pre-approved vendor (faster than onboarding new one)
5. Use standard contract template (avoid custom terms)

**Can't be expedited**: Legal compliance, CFO approval (if required), InfoSec review

---

### Q: What if the vendor doesn't have insurance?
**A**: Options:
1. Vendor purchases COI (Certificate of Insurance) naming IOG as additional insured
2. IOG assesses if lower coverage acceptable for low-risk work (<$25K)
3. Find alternative vendor

**Minimum insurance**: $1M general liability (higher for some engagements)

---

## Vendor Performance and Issues

### Q: What if a vendor isn't performing?
**A**: Steps:
1. Document performance issues
2. Communicate concerns to vendor
3. Contact Andrea Smith (procurement@iog.com)
4. Procurement will work with you on resolution (cure period, termination, etc.)

**Options**: Performance improvement plan, reduce scope, terminate contract

---

### Q: How do I rate vendor performance?
**A**: For contracts >$50K:
- Quarterly performance reviews required
- Use standard IOG vendor scorecard
- Share with vendor and procurement
- Used for future vendor selection decisions

**Factors**: Quality, timeliness, communication, value, professionalism

---

### Q: Can I add scope to an existing contract?
**A**: Depends on contract type:

**Fixed Price**: Requires change order
- New scope documented
- Costs negotiated
- Same approval level as original contract
- Amendment executed

**Time & Materials**: Can add scope if under NTE
- Additional hours/effort approved
- May need to increase NTE (requires approval)

---

## International and Special Situations

### Q: Can we hire international vendors?
**A**: Yes, but additional requirements:
- W-8 tax form (instead of W-9)
- Wire transfer details (SWIFT, IBAN)
- May need country-specific compliance terms
- Payment takes 5-7 business days (vs 3-5 domestic)

**Some countries have restrictions** - check with procurement early.

---

### Q: What about vendor conflicts of interest?
**A**: Vendors must disclose:
- Work for IOG competitors
- Personal relationships with IOG employees
- Other business relationships with IOG

**Procurement reviews** and determines if acceptable or disqualifying.

---

### Q: Can vendors work on-site at IOG?
**A**: Yes, but requires:
- Background check (3-5 days)
- InfoSec approval
- Badge/access request
- Signed facility access agreement

**Plan ahead**: Add 1-2 weeks to timeline for on-site vendor setup.

---

### Q: What about open source software or free tools?
**A**: Still requires procurement review for:
- License compliance (MIT, GPL, Apache, etc.)
- InfoSec assessment if handling data
- Support and maintenance plans

**Process is faster** than paid software, but still required.

---

## Self-Service and Resources

### Q: Where can I find approved vendors by skillset?
**A**: Three ways:
1. Contact James Chen (james.chen@iog.com) - maintains vendor database
2. Call procurement AI assistant - ask "Which vendors have [skill]?"
3. Check internal vendor database (SharePoint: Procurement → Vendor Database)

---

### Q: Where are contract templates stored?
**A**:
- **Confluence**: IOG Procurement → Contract Templates
- **SharePoint**: Legal → Templates → Procurement

**Always use latest version** (check date/version number)

---

### Q: Who handles invoice payment issues?
**A**: 
- **General payment questions**: ap@iog.com
- **Invoice disputes**: ap@iog.com (cc: procurement@iog.com)
- **Missing PO numbers**: procurement@iog.com

---

### Q: How do I check status of my procurement request?
**A**:
- Check JIRA ticket for updates
- Email procurement@iog.com with ticket number
- For urgent status: Call Andrea Smith

**Typical updates**: Request received → Under review → Approved/Returned → PO issued

---

## Contact Information

### General Procurement:
**Email**: procurement@iog.com  
**JIRA**: Procurement Requests project

### Procurement Team:
- **Andrea Smith** (Procurement Manager): andrea.smith@iog.com - Escalations, expedited requests, policy questions
- **Maria Santos** (Senior Procurement Specialist): maria.santos@iog.com - Vendor onboarding, contract questions
- **James Chen** (Procurement Analyst): james.chen@iog.com - Vendor database, historical data, reporting

### Related Teams:
- **Legal Review**: legal@iog.com
- **InfoSec Review**: infosec@iog.com
- **Accounts Payable**: ap@iog.com

### AI Assistant:
- **Phone**: +1 (XXX) XXX-XXXX
- **Can help with**: Vendor searches, policy questions, request validation, general guidance

---

## Quick Reference: Before You Submit

**✅ Checklist for Complete Procurement Request:**
- [ ] Budget number
- [ ] Project description and justification
- [ ] Milestones and timeline
- [ ] Cost breakdown or vendor quote
- [ ] Deadline or urgency noted
- [ ] Vendor information (if known)
- [ ] Business stakeholder approval (for >$50K)

**Submit incomplete request = Returned = Delays project**

**Average time lost from incomplete submission: 3-5 days**
