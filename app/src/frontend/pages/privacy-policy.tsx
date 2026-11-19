import React from 'react';
import { Link } from 'react-router-dom';

import { CCConfig } from '../../cc-config';
let config: CCConfig = require('../../cc-config.json')

/*
 * Who is responsible, the law, the regulator, the contact and where data is stored are Colouring Ghana's,
 * not the London project's. Ticket: docs/tickets/location-search/issues/20-privacy-policy-and-contact-page.md
 */
const departmentWebsite = 'https://geomatics.knust.edu.gh/';
const departmentEmail = 'geomaticeng@knust.edu.gh';
const dataProtectionCommissionWebsite = 'https://www.dataprotection.org.gh/';

const PrivacyPolicyPage: React.SFC<any> = () => (
    <article>
        <section className='main-col'>
            <h1 className='h1'>Privacy Policy & Platform Security</ h1>
            <h2 className='h2'>Colouring {config.cityName} Privacy Policy with respect to personal data</h2>
            <p>
                This privacy policy explains how Colouring {config.cityName} uses the personal data we collect from you when you use our website. Colouring {config.cityName} is a research project run by the Department of Geomatic Engineering at {config.institution} (KNUST), Kumasi, Ghana.
            </p>

            <h2 className='h2'>What data do we collect?</h2>
            <p>
                Colouring {config.cityName} collects the following personal data:
            </p>
            <p>
                A username and email address. We recommend you do not use your actual name for your username. We also collect your password, which is stored as a cryptographic hash unique to Colouring {config.cityName}.
            </p>

            <h2 className='h2'>How do we collect your data?</h2>
            <p>
                You provide Colouring {config.cityName} with a minimal amount of personal data when you register with the website and accepts the terms and conditions including this privacy policy.
            </p>

            <h2 className='h2'>What purposes do we use your data?</h2>
            <p>
                Colouring {config.cityName} uses your personal data to enable you to login to access and contribute to the Colouring {config.cityName} project and to provide a personalised user experience when you are logged in. We will not share your personal data (such as your email address) with any other parties or use your personal data for any purposes other than the Colouring {config.cityName} project.
            </p>
            <p>
                If you request a password reset, an automated email will be sent using an email delivery service, which processes the email in order to deliver it to your email address. The email delivery service retains personal data it processes on behalf of Colouring {config.cityName} for as long as is needed to provide email services. It will retain the personal information as necessary to comply with its legal obligations, resolve disputes, and enforce its agreements.
            </p>

            <h2 className='h2'>What is the legal basis for processing your data?</h2>
            <p>
                Data protection laws, including Ghana’s Data Protection Act, 2012 (Act 843), require us to meet certain conditions before we are allowed to use your data in the manner described in this notice, including having a ‘legal basis’ for the processing. Colouring {config.cityName}, as a research project, is processing your personal data in pursuance of its legitimate interests.
            </p>

            <h2 className='h2'>How do we store your data?</h2>
            <p>
                {config.privacyStatement}
            </p>

            <h2 className='h2'>How do we use cookies?</h2>
            <p>
                Colouring {config.cityName} only uses cookies to improve the user experience of users of the website, for example we use cookies to keep you signed in. We do not use cookies for marketing or advertising purposes.
            </p>

            <h2 className='h2'>What are your data protection rights?</h2>
            <p>
                Under data protection law, you have certain individual rights in relation to the personal information we hold about you. For the purposes of research where such individual rights would seriously impair research outcomes, such rights are limited. However, subject to certain conditions, you have the following rights in relation to your personal data:
            </p>

            <ul>
                <li>
                    A right to access personal data held by us about you.
                </ li>

                <li>
                    A right to require us to rectify any inaccurate personal data held by us about you.
                </ li>

                <li>
                    A right to require us to erase personal data held by us about you. This right will only apply where, for example, we no longer need to use the personal data to achieve the purpose we collected it for.
                </ li>

                <li>
                    A right to restrict our processing of personal data held by us about you. This right will only apply where, for example, you dispute the accuracy of the personal data held by us; or where you would have the right to require us to erase the personal data but would prefer that our processing is restricted instead; or where we no longer need to use the personal data to achieve the purpose we collected it for, but we require the data for the purposes of dealing with legal claims.
                </ li>

                <li>
                    A right to receive personal data, which you have provided to us, in a structured, commonly used and machine-readable format. You also have the right to require us to transfer this personal data to another organisation.
                </ li>

                <li>
                    A right to object to our processing of personal data held by us about you.
                </ li>

                <li>
                    A right to withdraw your consent, where we are relying on it to use your personal data.
                </ li>

                <li>
                    A right to ask us not to use information about you in a way that allows computers to make decisions about you and ask us to stop.
                </ li>

            </ul>

            <p>
                It is important to understand that the extent to which these rights apply to research will vary and that in some circumstances your rights may be restricted. If you notify us (using the contact details set out below) that you wish to exercise any of the above rights and it is considered necessary to refuse to comply with any of your individual rights, you will be informed of the decision and the reasons for it, and you also have the right to complain about our decision to the Data Protection Commission, Ghana.
            </p>

            <p>
                Please also note that we can only comply with a request to exercise your rights during the period for which we hold personal information about you. If that information has been irreversibly anonymised and has become part of the research data set, it will no longer be possible for us to access your personal information.
            </p>

            <h2 className='h2'>Changes to this privacy policy</h2>
            <p>
                Changes to this privacy policy will be notified via the Colouring {config.cityName} website. This privacy policy was last updated on 19 November 2026, when it was adapted for Colouring {config.cityName}.
            </p>

            <h2 className='h2'>Who do I contact with questions?</h2>
            <p>
                If you wish to complain about our use of your personal data or exercise any of your rights, please contact the Department of Geomatic Engineering, {config.institution}, by email at <a href={`mailto:${departmentEmail}`}>{departmentEmail}</a> or through its website at <a href={departmentWebsite}>{departmentWebsite}</a>.
            </p>

            <p>
                If we are unable to adequately address any concerns you may have about the way in which we use your data, you have the right to lodge a formal complaint with the Data Protection Commission, Ghana. Full details may be accessed on the <a href={dataProtectionCommissionWebsite}>Data Protection Commission website</a>.
            </p>

            <h2 className='h2'>Further information on privacy and security</h2>
            <p>
                Please note when you make a contribution to Colouring {config.cityName}, you are creating a permanent, public record of all data added, removed, or changed by you. The database records the username and ID of the user making the edit, along with the time and date of the change. All of this information is also made publicly available through the website and through bulk downloads of the edit history. User names of contributors providing the highest number of edits are also included in our Leaderboards.
            </p>

            <p>
                Please also note that when you contribute to Colouring {config.cityName}, you make your contributions available as open data for anyone to copy, distribute, transmit and adapt in line with the licence, and to use as they see fit. Though we rigorously assess each data type, to help protect building occupiers' privacy and security we welcome any ideas for improvements.
            </p>

            <p>
                Progress on Colouring Cities features specifically designed to address ethical issues, including these relating to security and privacy, can be tracked and commented on in the issues of the Colouring Cities code repository on GitHub, at <a href={`${config.githubURL}/issues`}>{`${config.githubURL}/issues`}</a>. If you have any immediate concerns regarding security or privacy please contact the Department of Geomatic Engineering by email at <a href={`mailto:${departmentEmail}`}>{departmentEmail}</a> or through its website at <a href={departmentWebsite}>{departmentWebsite}</a>.
            </p>

            <div className="buttons-container">
                <Link to="sign-up.html" className="btn btn-outline-dark">Back to sign up</Link>
            </div>
        </section>
    </article>
);

export default PrivacyPolicyPage;
