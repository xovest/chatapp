import React from "react";
import { 
  ApolloClient, 
  InMemoryCache, 
  ApolloProvider, 
  useSubscription, 
  gql,
  useMutation
} from '@apollo/client';
import { 
  Container,
  Row,
  Col,
  FormInput,
  Button
} from 'shards-react';
import express from 'express';
import {
  graphqlExpress,
  graphiqlExpress,
} from 'apollo-server-express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { execute, subscribe } from 'graphql';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';

const client = new ApolloClient({
  uri: 'http://localhost:4000/',
  cache: new InMemoryCache()
});

const GET_MESSAGES = gql`
  subscription {
    messages {
      id
      content
      user
    }
  }
`;

const POST_MESSAGE = gql`
  mutation ($user: String!, $content: String!) {
    postMessage(user: $user, content: $content)
  }
`;

const PORT = 4000;
const server = express();

server.use('*', cors({ origin: `http://localhost:${PORT}` }));

server.use('/graphql', bodyParser.json(), graphqlExpress({
  GET_MESSAGES,
  POST_MESSAGE
}));

server.use('/graphiql', graphiqlExpress({
  endpointURL: '/graphql',
  subscriptionsEndpoint: `ws://localhost:${PORT}/subscriptions`
}));

// Wrap the Express server
const ws = createServer(server);
ws.listen(PORT, () => {
  console.log(`Apollo Server is now running on http://localhost:${PORT}`);
  // Set up the WebSocket for handling GraphQL subscriptions
  new SubscriptionServer({
    execute,
    subscribe,
    GET_MESSAGES,
    POST_MESSAGE
  }, {
    server: ws,
    path: '/subscriptions',
  });
});

const Messages = ({ user }) => {
  const { data } = useSubscription(GET_MESSAGES);
  if (!data) return null;

  return (
    <>
      {data.messages.map(({ id, user: messageUser, content }) => (
        <div
          style={{
            display: 'flex',
            justifyContent: user === messageUser ? 'flex-end' : 'flex-start',
            paddingBottom: '1em'
          }}
        >
          {user !== messageUser && (
            <div
              style={{
                height: 50,
                width: 50,
                marginRight: '0.5em',
                border: '2px solid #FFA500',
                borderRadius: 25,
                textAlign: 'center',
                fontSize: '18pt',
                paddingTop: 5
              }}
            >
              {messageUser.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div
            style={{
              background: user === messageUser ? '#4169E1' : '#FFA500',
              color: user === messageUser ? 'white' : 'black',
              padding: '1em',
              borderRadius: '1em',
              maxWidth: '60%'
            }}
          >
            {content}
          </div>
        </div>
      ))}
    </>
  );
};

const Chat = () => {
  const [state, setState] = React.useState({
    user: 'Ryan',
    content: '',
  });

  const [postMessage] = useMutation(POST_MESSAGE);
  const onSend = () => {
    if (state.content.length > 0) {
      postMessage({
        variables: state
      });
    }

    setState({
      ...state,
      content: ''
    });
  };

  return (
    <Container>
      <Messages user={state.user} />
      <Row>
        <Col xs={2} style={{ padding: 0 }}>
          <FormInput 
            label="User"
            value={state.user}
            onChange={(e) => setState({
              ...state,
              user: e.target.value
            })}
          />
        </Col>
        <Col xs={8}>
          <FormInput 
            label="Content"
            value={state.content}
            onChange={(e) => setState({
              ...state,
              content: e.target.value
            })}
            onKeyUp={(e) => {
              if (e.keyCode === 13) {
                onSend();
              }
            }}
          />
        </Col>
        <Col xs={2} style={{ padding: 0 }}>
          <Button onClick={() => onSend()}>
            Tweek
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default () => (
  <ApolloProvider client={client}>
    <Chat />
  </ApolloProvider>
);