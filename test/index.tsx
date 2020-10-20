import React from 'react';

export default function() {
  function Rp() {
    return React.createElement(
      'p',
      {
        a: '1',
        b: '2',
      },
      12,
    );
  }

  return <div>12</div>;
}

// export default class WrappedRegistrationForm extends React.Component {

//   constructor (props) {
//     super(props)
//     console.log(12);

//   }

//   render () {
//     return (
//       <div className="session">
//         12
//       </div>
//     )
//   }
// }
