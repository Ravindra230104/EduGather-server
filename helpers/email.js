exports.registerEmailParams = (email,token) =>{
    return {
        Source: process.env.EMAIL_FROM,
        Destination: {
            ToAddresses: [email],
        },
        ReplyToAddresses: [process.env.EMAIL_TO],
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: `
                        <html>
                           <h1>Verify your Email address</h1>
                           <p>Please use the following link to complete your registration:</p>
                           <p>${process.env.CLIENT_URL}/auth/activate/${token}</p>
                        </html>`,
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: 'Complete your registration',
            },
        },
    };

}




exports.forgotPasswordEmailParams = (email,token) =>{
    return {
        Source: process.env.EMAIL_FROM,
        Destination: {
            ToAddresses: [email],
        },
        ReplyToAddresses: [process.env.EMAIL_TO],
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: `
                        <html>
                           <h1>Reset Password Link</h1>
                           <p>Please use the following link to reset your password:</p>
                           <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
                        </html>`,
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: 'Reset your password',
            },
        },
    };

}

 

exports.linkPublishedParams = (email, data) => {
    return {
        Source: process.env.EMAIL_FROM,
        Destination: {
            ToAddresses: [email],
        },
        ReplyToAddresses: [process.env.EMAIL_FROM],
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: `
                        <html>
                           <body>
                               <h1>New Link Published | ravindrasapkal455@gmail.com</h1>
                               <p>New link titled <b>${data.title}</b> has been just published in the following categories:</p>
                               ${data.categories.map(c => `
                                   <div>
                                       <h2>${c.name}</h2>
                                       <img src="${c.image.url}" alt="${c.name}" style="height:50px"/>
                                       <h3><a href="${process.env.CLIENT_URL}/links/${c.slug}">Check it out!</a></h3>
                                   </div>
                               `).join('----------------------')}
                               <br/>
                               <p>Do not wish to receive notifications?</p>
                               <p>Turn off notifications by going to your <b>dashboard</b> > <b>update profile</b> and <b>uncheck the categories</b></p>
                               <p><a href="${process.env.CLIENT_URL}/user/profile/update">${process.env.CLIENT_URL}/user/profile/update</a></p>
                           </body>
                        </html>
                    `,
                },
            },
            Subject: {
                Charset: 'UTF-8',
                Data: 'New link published'
            },
        },
    };
};
